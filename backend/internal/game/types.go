package game

// ManSpriteKey identifies a player slot.
type ManSpriteKey string

const (
	Man1 ManSpriteKey = "man1"
	Man2 ManSpriteKey = "man2"
	Man3 ManSpriteKey = "man3"
	Man4 ManSpriteKey = "man4"
)

var ManKeys = []ManSpriteKey{Man1, Man2, Man3, Man4}

// Direction represents the facing/movement direction of a player.
type Direction string

const (
	DirUp    Direction = "up"
	DirDown  Direction = "down"
	DirLeft  Direction = "left"
	DirRight Direction = "right"
)

// ItemType represents powerup types that can be dropped by destroyed bricks.
type ItemType string

const (
	ItemFire     ItemType = "fire"
	ItemSpeed    ItemType = "speed"
	ItemMoreBomb ItemType = "moreBomb"
)
