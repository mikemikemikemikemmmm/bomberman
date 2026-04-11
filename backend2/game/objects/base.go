package objects

import (
	"bomberman/backend2/config"
	"bomberman/backend2/types"
)

type BaseObj struct {
	ObjType  types.ObjType
	Position types.Position
}

func NewBaseObj(index *types.MapIndex, objType types.ObjType) BaseObj {
	return BaseObj{
		ObjType: objType,
		Position: types.Position{
			PosX: index.IndexX * config.TileWidth,
			PosY: index.IndexY * config.TileWidth,
		},
	}
}

func (b *BaseObj) GetPosition() types.Position {
	return b.Position
}

func (b *BaseObj) GetMapIndex() types.MapIndex {
	return types.MapIndex{
		IndexX: b.Position.PosX / config.TileWidth,
		IndexY: b.Position.PosY / config.TileWidth,
	}
}

func (b *BaseObj) GetCenterMapIndex() types.MapIndex {
	half := config.TileWidth / 2
	return types.MapIndex{
		IndexX: (b.Position.PosX + half) / config.TileWidth,
		IndexY: (b.Position.PosY + half) / config.TileWidth,
	}
}
