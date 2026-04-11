package objects

import (
	"bomberman/backend2/types"
)

type ItemObj struct {
	Base     BaseObj
	ItemType types.ItemType
}

func NewItemObj(index *types.MapIndex, itemType types.ItemType) *ItemObj {
	return &ItemObj{
		Base:     NewBaseObj(index, types.ObjItem),
		ItemType: itemType,
	}
}
