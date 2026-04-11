package mapdata

type CellKind int

const (
	CellWall  CellKind = iota
	CellEmpty
	CellBrick
	CellMan1
	CellMan2
	CellMan3
	CellMan4
)

type MapMatrix [10][10]CellKind

type MapData struct {
	Matrix MapMatrix
}

var AllMapData = map[uint32]*MapData{
	1: {Matrix: Map1Matrix},
}
