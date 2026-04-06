package gamemap

// Map1 returns the default 10x10 bomberman map.
// W = Wall, B = Brick, E = Empty, 1-4 = player spawn points
func Map1() *Map {
	W := CellWall
	B := CellBrick
	E := CellEmpty
	m1 := CellMan1
	m2 := CellMan2
	m3 := CellMan3
	m4 := CellMan4

	return &Map{
		ID: 1,
		Matrix: MapMatrix{
			{W, W, W, W, W, W, W, W, W, W},
			{W, m1, E, B, B, B, B, E, m2, W},
			{W, E, W, B, W, W, B, W, E, W},
			{W, B, B, B, B, B, B, B, B, W},
			{W, B, W, B, W, W, B, W, B, W},
			{W, B, W, B, W, W, B, W, B, W},
			{W, B, B, B, B, B, B, B, B, W},
			{W, E, W, B, W, W, B, W, E, W},
			{W, m3, E, B, B, B, B, E, m4, W},
			{W, W, W, W, W, W, W, W, W, W},
		},
	}
}
