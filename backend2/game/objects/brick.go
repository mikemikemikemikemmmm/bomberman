package objects

import (
	"bomberman/backend2/types"
)

type BrickObj struct {
	Base      BaseObj
	IsRuining bool
}

func NewBrickObj(index *types.MapIndex) *BrickObj {
	return &BrickObj{
		Base:      NewBaseObj(index, types.ObjBrick),
		IsRuining: false,
	}
}
