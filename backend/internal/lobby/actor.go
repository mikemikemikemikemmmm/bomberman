package lobby

import (
	"log"

	"bomberman-backend/internal/state"
	"bomberman-backend/internal/ws/message"
)

// Run is the singleton lobby actor goroutine.
func Run(appState *state.AppState) {
	log.Println("[lobby] started")
	for raw := range appState.LobbyCh {
		cmd, ok := raw.(Command)
		if !ok {
			continue
		}
		switch cmd.Type {
		case CmdClientJoined:
			log.Printf("[lobby] client %d joined", cmd.ClientID)
			broadcastRoomList(appState)

		case CmdClientLeft:
			log.Printf("[lobby] client %d left", cmd.ClientID)

		case CmdBroadcastRoomList:
			broadcastRoomList(appState)
		}
	}
}

func broadcastRoomList(appState *state.AppState) {
	var rooms []message.RoomSummary
	appState.AllRooms(func(roomID uint32, ch chan any) {
		// Request room summary (fire-and-forget; room actor will broadcast)
		// For simplicity we collect what we know from state — room actors own detail
		rooms = append(rooms, message.RoomSummary{RoomID: roomID})
	})
	msg := message.MustEncode("roomList", message.RoomListPayload{Rooms: rooms})
	appState.Broadcast(msg)
}
