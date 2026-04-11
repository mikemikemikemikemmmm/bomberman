package config

const (
	MapW  = 10
	MapH  = 10
	TileWidth uint32 = 48

	GameDurationMs uint64 = 600_000
	GameTickMs            = 100 // milliseconds

	BaseManSpeed uint32 = 10
	MaxSpeed     uint32 = 12
	MaxBombNum   uint32 = 6
	MaxBombPower uint32 = 6

	BombCountdownMs    uint32 = 3000
	FireCountdownMs    uint32 = 500
	BrickRuinCountdownMs uint32 = 500
)
