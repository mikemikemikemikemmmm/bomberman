package room

import (
	"encoding/json"
	"log"

	"bomberman/backend2/game"
	"bomberman/backend2/state"
	"bomberman/backend2/types"
)

const maxRoomPlayerNum = 4

func RunRoomActor(
	roomID uint32,
	hostClientID uint32,
	hostClientName string,
	rx <-chan state.RoomCommand,
	appState *state.AppState,
) {
	rm := NewRoomState(roomID, hostClientID, hostClientName)

	// Publish room to lobby
	appState.RoomListCache.Store(roomID, rm.ToListItem())
	appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}
	broadcastRoomState(rm, appState)

	for cmd := range rx {
		switch cmd.Kind {
		case state.RoomPlayerJoin:
			if len(rm.Players) >= maxRoomPlayerNum {
				sendError(cmd.ClientID, "Room is full", appState)
				continue
			}
			spriteKey := types.ManSpriteKeyFromIndex(len(rm.Players))
			rm.Players = append(rm.Players, types.PlayerInfo{
				ID:           cmd.ClientID,
				Name:         cmd.ClientName,
				IsReady:      false,
				IsHost:       false,
				ManSpriteKey: spriteKey,
			})
			if cs := appState.GetClientState(cmd.ClientID); cs != nil {
				rid := roomID
				cs.SetRoomID(&rid)
			}
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyClientLeft, ClientID: cmd.ClientID}
			broadcastRoomState(rm, appState)
			appState.RoomListCache.Store(roomID, rm.ToListItem())
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}

		case state.RoomPlayerLeave:
			cid := cmd.ClientID
			rm.Players = filterPlayers(rm.Players, func(p types.PlayerInfo) bool { return p.ID != cid })
			if cs := appState.GetClientState(cid); cs != nil {
				cs.SetRoomID(nil)
			}
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyClientJoined, ClientID: cid}

			if len(rm.Players) == 0 {
				appState.RoomListCache.Delete(roomID)
				appState.RoomSenderMap.Delete(roomID)
				appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}
				log.Printf("room %d closed (empty)", roomID)
				return
			}
			// Reassign host if needed
			hasHost := false
			for _, p := range rm.Players {
				if p.IsHost {
					hasHost = true
					break
				}
			}
			if !hasHost {
				rm.Players[0].IsHost = true
			}
			broadcastRoomState(rm, appState)
			appState.RoomListCache.Store(roomID, rm.ToListItem())
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}

		case state.RoomToggleReady:
			for i, p := range rm.Players {
				if p.ID == cmd.ClientID {
					rm.Players[i].IsReady = !rm.Players[i].IsReady
					break
				}
			}
			broadcastRoomState(rm, appState)

		case state.RoomChangeMap:
			rm.MapID = cmd.MapID
			broadcastRoomState(rm, appState)
			appState.RoomListCache.Store(roomID, rm.ToListItem())
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}

		case state.RoomStartGame:
			isHost := false
			for _, p := range rm.Players {
				if p.ID == cmd.HostClientID && p.IsHost {
					isHost = true
					break
				}
			}
			if !isHost {
				continue
			}
			allReady := true
			for _, p := range rm.Players {
				if !p.IsReady && !p.IsHost {
					allReady = false
					break
				}
			}
			if !allReady {
				sendError(cmd.HostClientID, "Not all players are ready", appState)
				continue
			}

			gameID := appState.AllocGameID()
			gameCh := make(chan state.GameCommand, 256)
			appState.GameSenderMap.Store(gameID, gameCh)

			for _, p := range rm.Players {
				if cs := appState.GetClientState(p.ID); cs != nil {
					gid := gameID
					cs.SetGameID(&gid)
					cs.SetRoomID(nil)
				}
			}

			appState.RoomListCache.Delete(roomID)
			appState.RoomSenderMap.Delete(roomID)
			appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyBroadcastRoomList}

			players := make([]types.PlayerInfo, len(rm.Players))
			copy(players, rm.Players)
			mapID := rm.MapID

			go game.RunGameActor(gameID, players, mapID, gameCh, appState)
			log.Printf("room %d started game %d", roomID, gameID)
			return
		}
	}
}

func broadcastRoomState(rm *RoomState, appState *state.AppState) {
	data := rm.ToClientData()
	b, _ := json.Marshal(map[string]interface{}{
		"type": "roomState",
		"payload": map[string]interface{}{
			"roomId":  rm.ID,
			"mapId":   rm.MapID,
			"players": data,
		},
	})
	for _, p := range rm.Players {
		appState.SendToClient(p.ID, b)
	}
}

func sendError(clientID uint32, msg string, appState *state.AppState) {
	b, _ := json.Marshal(map[string]interface{}{
		"type":    "error",
		"payload": map[string]interface{}{"msg": msg},
	})
	appState.SendToClient(clientID, b)
}

func filterPlayers(players []types.PlayerInfo, keep func(types.PlayerInfo) bool) []types.PlayerInfo {
	result := players[:0]
	for _, p := range players {
		if keep(p) {
			result = append(result, p)
		}
	}
	return result
}
