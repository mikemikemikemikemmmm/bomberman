package ws

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"bomberman-backend/internal/game"
	"bomberman-backend/internal/lobby"
	"bomberman-backend/internal/room"
	"bomberman-backend/internal/state"
	"bomberman-backend/internal/ws/message"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Handler returns an http.HandlerFunc that accepts WebSocket connections.
func Handler(appState *state.AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[ws] upgrade error: %v", err)
			return
		}

		clientID := appState.NextClientID()
		sendCh := make(chan []byte, 256)
		entry := &state.ClientEntry{
			ID:     clientID,
			SendCh: sendCh,
		}
		appState.AddClient(entry)
		defer func() {
			appState.RemoveClient(clientID)
			conn.Close()
			// Notify lobby
			appState.LobbyCh <- lobby.Command{Type: lobby.CmdClientLeft, ClientID: clientID}
			// Notify room/game if applicable
			if entry.RoomID != nil {
				appState.SendToRoom(*entry.RoomID, room.Command{Type: room.CmdPlayerLeave, ClientID: clientID})
			}
			if entry.GameID != nil {
				appState.SendToGame(*entry.GameID, game.Command{
					Type:             game.CmdPlayerDisconnected,
					PlayerDisconnect: &clientID,
				})
			}
			log.Printf("[ws] client %d disconnected", clientID)
		}()

		// Send "connected" confirmation
		connMsg := message.MustEncode("connected", message.ConnectedPayload{UserID: clientID})
		sendCh <- connMsg

		// Notify lobby
		appState.LobbyCh <- lobby.Command{Type: lobby.CmdClientJoined, ClientID: clientID}

		log.Printf("[ws] client %d connected", clientID)

		// Write pump
		go func() {
			for msg := range sendCh {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Printf("[ws] write error client %d: %v", clientID, err)
					return
				}
			}
		}()

		// Read pump (blocks until disconnect)
		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				return
			}
			var base message.Base
			if err := json.Unmarshal(raw, &base); err != nil {
				log.Printf("[ws] malformed message from client %d: %v", clientID, err)
				continue
			}
			routeMessage(appState, entry, base)
		}
	}
}

func routeMessage(appState *state.AppState, entry *state.ClientEntry, base message.Base) {
	switch base.Type {
	// --- Lobby messages ---
	case "setName":
		var p message.SetNamePayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		entry.Name = p.Name

	case "createRoom":
		var p message.CreateRoomPayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		roomID := appState.NextRoomID()
		rs := room.NewState(roomID, p.Name, entry.ID, entry.Name)
		ch := make(chan any, 256)
		appState.AddRoom(roomID, ch)
		go room.Run(appState, rs, ch)
		// Auto-join host
		appState.SendToRoom(roomID, room.Command{
			Type: room.CmdPlayerJoin, ClientID: entry.ID, ClientName: entry.Name,
		})
		// Tell lobby to refresh
		appState.LobbyCh <- lobby.Command{Type: lobby.CmdBroadcastRoomList}

	case "joinRoom":
		var p message.JoinRoomFromLobbyPayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		appState.SendToRoom(p.RoomID, room.Command{
			Type: room.CmdPlayerJoin, ClientID: entry.ID, ClientName: entry.Name,
		})

	// --- Room messages ---
	case "leaveRoom":
		if entry.RoomID != nil {
			appState.SendToRoom(*entry.RoomID, room.Command{
				Type: room.CmdPlayerLeave, ClientID: entry.ID,
			})
		}

	case "toggleReady":
		if entry.RoomID != nil {
			appState.SendToRoom(*entry.RoomID, room.Command{
				Type: room.CmdToggleReady, ClientID: entry.ID,
			})
		}

	case "changeMap":
		var p message.ChangeMapPayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		if entry.RoomID != nil {
			appState.SendToRoom(*entry.RoomID, room.Command{
				Type: room.CmdChangeMap, ClientID: entry.ID, MapID: p.MapID,
			})
		}

	case "startGame":
		if entry.RoomID != nil {
			appState.SendToRoom(*entry.RoomID, room.Command{
				Type: room.CmdStartGame, HostClientID: entry.ID,
			})
		}

	// --- Game messages ---
	case "playerMove":
		var p game.PlayerMovePayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		if entry.GameID != nil {
			appState.SendToGame(*entry.GameID, game.Command{
				Type: game.CmdPlayerMove, PlayerMove: &p,
			})
		}

	case "generateBomb":
		var p game.GenerateBombPayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		if entry.GameID != nil {
			appState.SendToGame(*entry.GameID, game.Command{
				Type: game.CmdGenerateBomb, GenerateBomb: &p,
			})
		}

	case "timeSyncPing":
		var p game.TimeSyncPingPayload
		if err := json.Unmarshal(base.Payload, &p); err != nil {
			return
		}
		if entry.GameID != nil {
			appState.SendToGame(*entry.GameID, game.Command{
				Type: game.CmdTimeSyncPing, TimeSyncPing: &p,
			})
		}

	default:
		log.Printf("[ws] unknown message type: %s", base.Type)
	}
}
