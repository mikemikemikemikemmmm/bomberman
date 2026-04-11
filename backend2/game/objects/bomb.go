package objects

import (
	"bomberman/backend2/config"
	"bomberman/backend2/types"
)

type BombObj struct {
	Base        BaseObj
	RemainingMs uint32
	Power       uint32
	ManKey      types.ManSpriteKey
}

func NewBombObj(index *types.MapIndex, power uint32, manKey types.ManSpriteKey) *BombObj {
	return &BombObj{
		Base:        NewBaseObj(index, types.ObjBomb),
		RemainingMs: config.BombCountdownMs,
		Power:       power,
		ManKey:      manKey,
	}
}
