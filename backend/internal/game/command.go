package game

// CommandType identifies which command is being sent to the game actor.
type CommandType int

const (
	CmdPlayerMove CommandType = iota
	CmdGenerateBomb
	CmdPlayerDisconnected
	CmdTimeSyncPing
)

// PlayerMovePayload mirrors the client JSON for player movement.
type PlayerMovePayload struct {
	ManKey   ManSpriteKey `json:"manKey"`
	NewX     float64      `json:"newX"`
	NewY     float64      `json:"newY"`
	Dir      Direction    `json:"dir"`
	IsMoving bool         `json:"isMoving"`
	UserID   uint32       `json:"userId"`
}

// GenerateBombPayload mirrors the client JSON for bomb placement.
type GenerateBombPayload struct {
	ManKey    ManSpriteKey `json:"manKey"`
	X         float64      `json:"x"`
	Y         float64      `json:"y"`
	BombPower int          `json:"bombPower"`
}

// TimeSyncPingPayload mirrors the client JSON for time sync.
type TimeSyncPingPayload struct {
	SentAt int64  `json:"sentAt"`
	From   string `json:"from"`
}

// Command is a message sent to the game actor.
type Command struct {
	Type             CommandType
	PlayerMove       *PlayerMovePayload
	GenerateBomb     *GenerateBombPayload
	PlayerDisconnect *uint32
	TimeSyncPing     *TimeSyncPingPayload
}
