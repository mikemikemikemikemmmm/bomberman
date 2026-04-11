package objects

import (
	"bomberman/backend2/config"
	"bomberman/backend2/types"
)

type ManObj struct {
	Base               BaseObj
	IsAlive            bool
	ManSpriteKey       types.ManSpriteKey
	Dir                types.ManDirection
	IsMoving           bool
	UsedBombNum        uint32
	Speed              uint32
	BombNum            uint32
	BombPower          uint32
	CanPassBombPosList []types.Position
}

func NewManObj(index *types.MapIndex, manKey types.ManSpriteKey) *ManObj {
	return &ManObj{
		Base:               NewBaseObj(index, types.ObjMan),
		IsAlive:            true,
		ManSpriteKey:       manKey,
		Dir:                types.DirDown,
		IsMoving:           false,
		UsedBombNum:        0,
		Speed:              config.BaseManSpeed,
		BombNum:            2,
		BombPower:          2,
		CanPassBombPosList: []types.Position{},
	}
}

func (m *ManObj) EatItem(itemType types.ItemType) {
	switch itemType {
	case types.ItemSpeed:
		if m.Speed < config.MaxSpeed {
			m.Speed++
		}
	case types.ItemMoreBomb:
		if m.BombNum < config.MaxBombNum {
			m.BombNum++
		}
	case types.ItemFire:
		if m.BombPower < config.MaxBombPower {
			m.BombPower++
		}
	}
}
