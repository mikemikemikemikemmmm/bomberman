package room

import (
	"log"
	"time"

	"bomberman-backend/internal/game"
	gamemap "bomberman-backend/internal/game/map"
	"bomberman-backend/internal/state"
	"bomberman-backend/internal/ws/message"
)

// Run is the room actor goroutine. Each room has one.
func Run(appState *state.AppState, roomState *State, ch chan any) {
	log.Printf("[room %d] started", roomState.RoomID)
	defer func() {
		appState.RemoveRoom(roomState.RoomID)
		// Tell lobby to refresh room list
		appState.LobbyCh <- struct{}{}
		log.Printf("[room %d] closed", roomState.RoomID)
	}()

	broadcastState(appState, roomState)

	for raw := range ch {
		cmd, ok := raw.(Command)
		if !ok {
			continue
		}
		switch cmd.Type {
		case CmdPlayerJoin:
			if roomState.IsFull() {
				continue
			}
			if roomState.FindPlayer(cmd.ClientID) != nil {
				continue
			}
			roomState.Players = append(roomState.Players, &PlayerEntry{
				ClientID: cmd.ClientID,
				Name:     cmd.ClientName,
				IsReady:  false,
			})
			// Update client's room membership
			if c, ok := appState.GetClient(cmd.ClientID); ok {
				id := roomState.RoomID
				c.RoomID = &id
			}
			log.Printf("[room %d] player %d joined", roomState.RoomID, cmd.ClientID)
			broadcastState(appState, roomState)

		case CmdPlayerLeave:
			roomState.RemovePlayer(cmd.ClientID)
			if c, ok := appState.GetClient(cmd.ClientID); ok {
				c.RoomID = nil
			}
			log.Printf("[room %d] player %d left", roomState.RoomID, cmd.ClientID)
			if len(roomState.Players) == 0 {
				return // close room
			}
			broadcastState(appState, roomState)

		case CmdToggleReady:
			if p := roomState.FindPlayer(cmd.ClientID); p != nil {
				p.IsReady = !p.IsReady
			}
			broadcastState(appState, roomState)

		case CmdChangeMap:
			if cmd.ClientID == roomState.Host {
				roomState.MapID = cmd.MapID
			}
			broadcastState(appState, roomState)

		case CmdStartGame:
			if cmd.HostClientID != roomState.Host {
				continue
			}
			startGame(appState, roomState)
			return // room dissolves when game starts
		}
	}
}

func broadcastState(appState *state.AppState, rs *State) {
	players := make([]message.RoomPlayerInfo, 0, len(rs.Players))
	for _, p := range rs.Players {
		players = append(players, message.RoomPlayerInfo{
			ClientID: p.ClientID,
			Name:     p.Name,
			IsReady:  p.IsReady,
			IsHost:   p.ClientID == rs.Host,
		})
	}
	msg := message.MustEncode("roomState", message.RoomStatePayload{
		RoomID:  rs.RoomID,
		Name:    rs.Name,
		MapID:   rs.MapID,
		Players: players,
	})
	for _, p := range rs.Players {
		appState.SendToClient(p.ClientID, msg)
	}
}

func startGame(appState *state.AppState, rs *State) {
	m := gamemap.GetByID(rs.MapID)

	// Assign man keys and spawn positions
	manKeys := game.ManKeys
	players := make(map[game.ManSpriteKey]*game.Player)
	clientIDs := make([]uint32, 0, len(rs.Players))
	var startedPlayers []message.GameStartedPlayerInfo

	spawnPoints := findSpawnPoints(m)

	for i, rp := range rs.Players {
		if i >= len(manKeys) || i >= len(spawnPoints) {
			break
		}
		key := manKeys[i]
		sp := spawnPoints[i]
		x, y := uint32(sp[0]), uint32(sp[1])
		p := game.NewPlayer(rp.Name, rp.ClientID, key, x, y)
		players[key] = p
		clientIDs = append(clientIDs, rp.ClientID)
		startedPlayers = append(startedPlayers, message.GameStartedPlayerInfo{
			ClientID: rp.ClientID, Name: rp.Name, ManKey: key, X: x, Y: y,
		})
	}

	gameID := appState.NextRoomID()
	endTime := time.Now().UnixMilli() + game.GameDurationMs
	gs := game.NewGameState(m, players, endTime)

	ch := make(chan any, 256)
	appState.AddGame(gameID, ch)

	// Update client game membership
	for _, cid := range clientIDs {
		if c, ok := appState.GetClient(cid); ok {
			id := gameID
			c.GameID = &id
			c.RoomID = nil
		}
	}

	// Broadcast gameStarted before actor begins
	startMsg := message.MustEncode("gameStarted", message.GameStartedPayload{
		GameEndTimeMs: endTime,
		Players:       startedPlayers,
	})
	for _, cid := range clientIDs {
		appState.SendToClient(cid, startMsg)
	}

	sendFn := func(clientID uint32, msg []byte) { appState.SendToClient(clientID, msg) }
	broadcastFn := func(ids []uint32, msg []byte) {
		for _, id := range ids {
			appState.SendToClient(id, msg)
		}
	}
	onDone := func(gid uint32) { appState.RemoveGame(gid) }

	actor := game.NewActor(gameID, gs, clientIDs, ch, sendFn, broadcastFn, onDone)
	go actor.Run()

	log.Printf("[room %d] game %d started with %d players", rs.RoomID, gameID, len(clientIDs))
}

func findSpawnPoints(m *gamemap.Map) [][2]int {
	spawnCells := []gamemap.CellType{gamemap.CellMan1, gamemap.CellMan2, gamemap.CellMan3, gamemap.CellMan4}
	result := make([][2]int, 4)
	for row := 0; row < gamemap.MapSize; row++ {
		for col := 0; col < gamemap.MapSize; col++ {
			cell := m.Matrix[row][col]
			for i, sc := range spawnCells {
				if cell == sc {
					result[i] = [2]int{col * game.TileWidth, row * game.TileWidth}
				}
			}
		}
	}
	return result
}
