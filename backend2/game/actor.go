package game

import (
	"encoding/json"
	"log"
	"time"

	"bomberman/backend2/game/event"
	"bomberman/backend2/game/mapdata"
	"bomberman/backend2/state"
	"bomberman/backend2/types"
)

func makeWsMsg(msgType string, payload interface{}) []byte {
	b, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	return b
}

func RunGameActor(
	gameID uint32,
	players []types.PlayerInfo,
	mapID uint32,
	rx <-chan state.GameCommand,
	appState *state.AppState,
) {
	playerIDs := make([]uint32, len(players))
	for i, p := range players {
		playerIDs[i] = p.ID
	}
	log.Printf("game %d started with %d players", gameID, len(players))

	broadcast := func(msg []byte) {
		for _, id := range playerIDs {
			appState.SendToClient(id, msg)
		}
	}

	mapData, ok := mapdata.AllMapData[mapID]
	if !ok {
		log.Printf("game %d: map %d not found", gameID, mapID)
		broadcast(makeWsMsg("error", "noMap"))
		return
	}

	em := event.NewEventManager(mapData, players)

	// Notify all players game started
	startMsg := makeWsMsg("gameStarted", map[string]interface{}{
		"gameId":      gameID,
		"gameEndTime": em.GameEndTime,
	})
	broadcast(startMsg)

	ticker := time.NewTicker(time.Duration(100) * time.Millisecond)
	defer ticker.Stop()

	var pending []state.GameCommand

	for {
		select {
		case <-ticker.C:
			em.ConsumeCommands(pending, appState)
			pending = pending[:0]
			if em.GameOver {
				goto done
			}
		case cmd, ok := <-rx:
			if !ok {
				goto done
			}
			pending = append(pending, cmd)
		}
	}

done:
	log.Printf("game %d ended", gameID)
	appState.GameSenderMap.Delete(gameID)
}
