package gamemap

// CellType represents a tile type in the game map.
type CellType int

const (
	CellEmpty CellType = iota
	CellWall
	CellBrick
	CellMan1
	CellMan2
	CellMan3
	CellMan4
)

const MapSize = 10

type MapMatrix [MapSize][MapSize]CellType

// Map holds an ID and its tile matrix.
type Map struct {
	ID     int
	Matrix MapMatrix
}

// GetByID returns a map by its ID, defaulting to map 1.
func GetByID(id int) *Map {
	if id == 1 {
		return Map1()
	}
	return Map1()
}
