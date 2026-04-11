package manager

import (
	"bomberman/backend2/game/mapdata"
	"bomberman/backend2/game/objects"
	"bomberman/backend2/types"
)

// InitMapAndPlayers builds the tile map and spawns ManObjs from map data.
func InitMapAndPlayers(data *mapdata.MapData, playerManKeys []types.ManSpriteKey) (MapMatrix, []*objects.ManObj) {
	const H = 10
	const W = 10

	mapMatrix := make(MapMatrix, H)
	for y := range mapMatrix {
		mapMatrix[y] = make([]MapCell, W)
	}

	var players []*objects.ManObj

	for y, row := range data.Matrix {
		for x, cell := range row {
			index := types.MapIndex{IndexX: uint32(x), IndexY: uint32(y)}
			switch cell {
			case mapdata.CellWall:
				mapMatrix[y][x] = MapCell{Kind: TileWall}
			case mapdata.CellBrick:
				mapMatrix[y][x] = MapCell{Kind: TileBrick, Brick: objects.NewBrickObj(&index)}
			case mapdata.CellEmpty:
				// leave nil
			default:
				// spawn cell
				var defaultKey types.ManSpriteKey
				var spawnOrder int
				switch cell {
				case mapdata.CellMan1:
					defaultKey, spawnOrder = types.Man1, 0
				case mapdata.CellMan2:
					defaultKey, spawnOrder = types.Man2, 1
				case mapdata.CellMan3:
					defaultKey, spawnOrder = types.Man3, 2
				case mapdata.CellMan4:
					defaultKey, spawnOrder = types.Man4, 3
				}
				manKey := defaultKey
				if spawnOrder < len(playerManKeys) {
					manKey = playerManKeys[spawnOrder]
				}
				man := objects.NewManObj(&index, manKey)
				players = append(players, man)
				// spawn tile is walkable
				mapMatrix[y][x] = MapCell{Kind: TileEmpty}
			}
		}
	}

	return mapMatrix, players
}
