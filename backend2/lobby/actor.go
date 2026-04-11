package lobby

import (
	"encoding/json"
	"log"

	"bomberman/backend2/state"
	"bomberman/backend2/types"
)

func RunLobbyActor(rx <-chan state.LobbyCommand, appState *state.AppState) {
	lobbyClients := map[uint32]bool{}

	for cmd := range rx {
		switch cmd.Kind {
		case state.LobbyClientJoined:
			lobbyClients[cmd.ClientID] = true
			sendRoomListTo([]uint32{cmd.ClientID}, appState)

		case state.LobbyClientLeft:
			delete(lobbyClients, cmd.ClientID)

		case state.LobbyBroadcastRoomList:
			ids := make([]uint32, 0, len(lobbyClients))
			for id := range lobbyClients {
				ids = append(ids, id)
			}
			sendRoomListTo(ids, appState)
		}
	}
	log.Println("lobby actor exited")
}

func sendRoomListTo(clientIDs []uint32, appState *state.AppState) {
	var roomList []types.RoomListItem
	appState.RoomListCache.Range(func(_, v interface{}) bool {
		roomList = append(roomList, v.(types.RoomListItem))
		return true
	})

	b, _ := json.Marshal(map[string]interface{}{
		"type":    "roomList",
		"payload": roomList,
	})
	for _, id := range clientIDs {
		appState.SendToClient(id, b)
	}
}
