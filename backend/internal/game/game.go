package game

import (
	"sync"

	gamemap "bomberman-backend/internal/game/map"
)

// ActiveBomb represents a live bomb on the map.
type ActiveBomb struct {
	ManKey      ManSpriteKey
	X           int
	Y           int
	Power       int
	ExplodeAtMs int64
}

// ActiveItem represents a powerup sitting on the map.
type ActiveItem struct {
	Type ManSpriteKey // reuse field; actual item type stored separately
	Item ItemType
	X    int
	Y    int
}

// ItemEatenPayload is queued when a player walks over an item.
type ItemEatenPayload struct {
	ManKey ManSpriteKey
	Item   ItemType
	X      int
	Y      int
}

// GameState holds all mutable state for a single active game.
type GameState struct {
	mu sync.Mutex

	MapMatrix    gamemap.MapMatrix
	Players      map[ManSpriteKey]*Player
	GameEndTimeMs int64

	ActiveBombs       []ActiveBomb
	ActiveItems       []ActiveItem
	PendingDeaths     []ManSpriteKey
	PendingItemEats   []ItemEatenPayload
	GameOver          bool
}

func NewGameState(m *gamemap.Map, players map[ManSpriteKey]*Player, gameEndMs int64) *GameState {
	return &GameState{
		MapMatrix:    m.Matrix,
		Players:      players,
		GameEndTimeMs: gameEndMs,
	}
}

func (gs *GameState) Lock()   { gs.mu.Lock() }
func (gs *GameState) Unlock() { gs.mu.Unlock() }
