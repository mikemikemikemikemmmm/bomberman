package message

// LeaveRoomPayload is sent by the client to leave the current room.
type LeaveRoomPayload struct{}

// ToggleReadyPayload is sent by the client to toggle ready state.
type ToggleReadyPayload struct{}

// ChangeMapPayload is sent by the room host to change the map.
type ChangeMapPayload struct {
	MapID int `json:"mapId"`
}

// StartGamePayload is sent by the room host to start the game.
type StartGamePayload struct{}

// RoomPlayerInfo describes a single player inside a room.
type RoomPlayerInfo struct {
	ClientID uint32 `json:"clientId"`
	Name     string `json:"name"`
	IsReady  bool   `json:"isReady"`
	IsHost   bool   `json:"isHost"`
}

// RoomStatePayload is broadcast to all players in a room whenever state changes.
type RoomStatePayload struct {
	RoomID  uint32           `json:"roomId"`
	Name    string           `json:"roomName"`
	MapID   int              `json:"mapId"`
	Players []RoomPlayerInfo `json:"players"`
}
