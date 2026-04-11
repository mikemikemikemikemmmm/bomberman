package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"bomberman/backend2/game"
	"bomberman/backend2/room"
	"bomberman/backend2/state"
	"bomberman/backend2/types"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type wsRawMessage struct {
	MsgType string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func makeWsMsg(msgType string, payload interface{}) []byte {
	b, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	return b
}

// HandleWs upgrades the HTTP connection and runs the client loop.
func HandleWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	appState := state.GetGlobalState()
	clientID := appState.AllocClientID()

	sendCh := make(chan []byte, 256)
	appState.ClientSenderMap.Store(clientID, sendCh)
	appState.ClientStateMap.Store(clientID, &state.ClientState{ID: clientID})

	appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyClientJoined, ClientID: clientID}
	log.Printf("client %d connected", clientID)

	// Send assigned ID
	appState.SendToClient(clientID, makeWsMsg("connected", map[string]interface{}{"userId": clientID}))

	// Mirror Rust test_game_start: auto-start a debug game
	testGameStart(clientID, appState)

	// Write pump
	go func() {
		defer conn.Close()
		for msg := range sendCh {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
	}()

	// Read pump (blocks until disconnect)
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg wsRawMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("client %d bad message: %v", clientID, err)
			continue
		}
		if err := handleMsg(clientID, msg, appState); err != nil {
			log.Printf("client %d handle_msg error: %v", clientID, err)
		}
	}

	log.Printf("client %d disconnected", clientID)
	cleanupClient(clientID, appState)
	close(sendCh)
}

func cleanupClient(clientID uint32, appState *state.AppState) {
	cs := appState.GetClientState(clientID)
	var roomID, gameID *uint32
	if cs != nil {
		roomID, gameID = cs.GetRoomAndGameID()
	}
	switch {
	case roomID != nil:
		appState.SendToRoom(*roomID, state.RoomCommand{Kind: state.RoomPlayerLeave, ClientID: clientID})
	case gameID != nil:
		appState.SendToGame(*gameID, state.GameCommand{Kind: state.GamePlayerDisconnected, ClientID: clientID})
	default:
		appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyClientLeft, ClientID: clientID}
	}
	appState.ClientSenderMap.Delete(clientID)
	appState.ClientStateMap.Delete(clientID)
}

func handleMsg(clientID uint32, msg wsRawMessage, appState *state.AppState) error {
	cs := appState.GetClientState(clientID)
	fmt.Print(msg)
	switch msg.MsgType {
	case "setName":
		var name string
		if err := json.Unmarshal(msg.Payload, &name); err != nil {
			return err
		}
		if cs != nil {
			cs.SetName(name)
		}

	case "createRoom":
		name := ""
		if cs != nil {
			name = cs.GetName()
		}
		roomID := appState.AllocRoomID()
		roomCh := make(chan state.RoomCommand, 256)
		appState.RoomSenderMap.Store(roomID, roomCh)
		if cs != nil {
			rid := roomID
			cs.SetRoomID(&rid)
		}
		appState.LobbySender <- state.LobbyCommand{Kind: state.LobbyClientLeft, ClientID: clientID}
		go room.RunRoomActor(roomID, clientID, name, roomCh, appState)

	case "joinRoom":
		var roomID uint32
		if err := json.Unmarshal(msg.Payload, &roomID); err != nil {
			return err
		}
		name := ""
		if cs != nil {
			name = cs.GetName()
		}
		appState.SendToRoom(roomID, state.RoomCommand{Kind: state.RoomPlayerJoin, ClientID: clientID, ClientName: name})

	case "leaveRoom":
		if cs != nil {
			if rid := cs.GetRoomID(); rid != nil {
				appState.SendToRoom(*rid, state.RoomCommand{Kind: state.RoomPlayerLeave, ClientID: clientID})
			}
		}

	case "toggleReady":
		if cs != nil {
			if rid := cs.GetRoomID(); rid != nil {
				appState.SendToRoom(*rid, state.RoomCommand{Kind: state.RoomToggleReady, ClientID: clientID})
			}
		}

	case "changeMap":
		var mapID uint32
		if err := json.Unmarshal(msg.Payload, &mapID); err != nil {
			return err
		}
		if cs != nil {
			if rid := cs.GetRoomID(); rid != nil {
				appState.SendToRoom(*rid, state.RoomCommand{Kind: state.RoomChangeMap, MapID: mapID})
			}
		}

	case "startGame":
		if cs != nil {
			if rid := cs.GetRoomID(); rid != nil {
				appState.SendToRoom(*rid, state.RoomCommand{Kind: state.RoomStartGame, HostClientID: clientID})
			}
		}

	case "playerMove":
		var p state.PlayerMovePayload
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return err
		}
		if cs != nil {
			if gid := cs.GetGameID(); gid != nil {
				appState.SendToGame(*gid, state.GameCommand{Kind: state.GamePlayerMove, Move: &p})
			}
		}

	case "generateBomb":
		var p state.GenerateBombPayload
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return err
		}
		if cs != nil {
			if gid := cs.GetGameID(); gid != nil {
				appState.SendToGame(*gid, state.GameCommand{Kind: state.GameGenerateBomb, Bomb: &p})
			}
		}

	case "timeSyncPing":
		var p struct {
			SentAt int64  `json:"sentAt"`
			From   string `json:"from"`
		}
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return err
		}
		if cs != nil {
			if gid := cs.GetGameID(); gid != nil {
				appState.SendToGame(*gid, state.GameCommand{Kind: state.GameTimeSyncPing, ClientID: clientID, SentAt: p.SentAt})
			}
		}

	default:
		log.Printf("unknown message type '%s' from client %d", msg.MsgType, clientID)
	}
	return nil
}

func testGameStart(hostClientID uint32, appState *state.AppState) {
	gameID := uint32(1)
	gameCh := make(chan state.GameCommand, 256)
	appState.GameSenderMap.Store(gameID, gameCh)
	if cs := appState.GetClientState(hostClientID); cs != nil {
		gid := gameID
		cs.SetGameID(&gid)
	}
	players := []types.PlayerInfo{{
		ID:           hostClientID,
		Name:         "test",
		IsReady:      true,
		IsHost:       true,
		ManSpriteKey: types.Man1,
	}}
	go game.RunGameActor(gameID, players, 1, gameCh, appState)
}
