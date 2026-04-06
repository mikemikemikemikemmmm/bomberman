package message

// ConnectedPayload is sent to a client immediately after connecting.
type ConnectedPayload struct {
	UserID uint32 `json:"userId"`
}

// SetNamePayload is sent by the client to set their display name.
type SetNamePayload struct {
	Name string `json:"name"`
}

// CreateRoomPayload is sent by the client to create a new room.
type CreateRoomPayload struct {
	Name string `json:"name"`
}

// JoinRoomFromLobbyPayload is sent by the client to join a room from the lobby.
type JoinRoomFromLobbyPayload struct {
	RoomID uint32 `json:"roomId"`
}

// RoomSummary is a single entry in the room list broadcast.
type RoomSummary struct {
	RoomID    uint32 `json:"roomId"`
	Name      string `json:"name"`
	MapID     int    `json:"mapId"`
	PlayerNum int    `json:"playerNum"`
	MaxPlayer int    `json:"maxPlayer"`
}

// RoomListPayload is broadcast to all lobby clients.
type RoomListPayload struct {
	Rooms []RoomSummary `json:"rooms"`
}
