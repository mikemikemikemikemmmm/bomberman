package message

import "bomberman-backend/internal/game"

// GameStartedPayload is broadcast when a game begins.
type GameStartedPayload struct {
	GameEndTimeMs int64                     `json:"gameEndTimeMs"`
	Players       []GameStartedPlayerInfo   `json:"players"`
}

type GameStartedPlayerInfo struct {
	ClientID uint32            `json:"clientId"`
	Name     string            `json:"name"`
	ManKey   game.ManSpriteKey `json:"manKey"`
	X        uint32            `json:"x"`
	Y        uint32            `json:"y"`
}

// PlayerMoveOutPayload is broadcast when a player moves.
type PlayerMoveOutPayload struct {
	ManKey   game.ManSpriteKey `json:"manKey"`
	NewX     float64           `json:"newX"`
	NewY     float64           `json:"newY"`
	Dir      game.Direction    `json:"dir"`
	IsMoving bool              `json:"isMoving"`
}

// GenerateBombOutPayload is broadcast when a bomb is placed.
type GenerateBombOutPayload struct {
	ManKey      game.ManSpriteKey `json:"manKey"`
	X           float64           `json:"x"`
	Y           float64           `json:"y"`
	BombPower   int               `json:"bombPower"`
	ExplodeAtMs int64             `json:"explodeAtMs"`
}

// BombExplodePayload is broadcast when a bomb detonates.
type BombExplodePayload struct {
	ManKey game.ManSpriteKey `json:"manKey"`
	X      int               `json:"x"`
	Y      int               `json:"y"`
	Power  int               `json:"power"`
}

// CreateItemPayload is broadcast when a powerup spawns.
type CreateItemPayload struct {
	Item game.ItemType `json:"item"`
	X    int           `json:"x"`
	Y    int           `json:"y"`
}

// ItemEatenPayload is broadcast when a player collects an item.
type ItemEatenPayload struct {
	ManKey game.ManSpriteKey `json:"manKey"`
	Item   game.ItemType     `json:"item"`
	X      int               `json:"x"`
	Y      int               `json:"y"`
}

// PlayerDiePayload is broadcast when a player dies.
type PlayerDiePayload struct {
	ManKey game.ManSpriteKey `json:"manKey"`
}

// TimeSyncPongPayload is sent back to the client that sent a ping.
type TimeSyncPongPayload struct {
	SentAt     int64  `json:"sentAt"`
	ServerTime int64  `json:"serverTime"`
	From       string `json:"from"`
}

// GameOverPayload is broadcast when the game ends.
type GameOverPayload struct {
	Winner *game.ManSpriteKey `json:"winner"` // nil if draw
}
