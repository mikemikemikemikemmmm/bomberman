package manager

import (
	"math/rand"

	"bomberman/backend2/config"
	"bomberman/backend2/game/objects"
	"bomberman/backend2/types"
)

// ─── Tile types ───────────────────────────────────────────────────────────────

type TileKind int

const (
	TileEmpty TileKind = iota
	TileWall
	TileBomb
	TileBrick
	TileItem
)

type MapCell struct {
	Kind  TileKind
	Bomb  *objects.BombObj
	Brick *objects.BrickObj
	Item  *objects.ItemObj
}

type MapMatrix [][]MapCell

// ─── ExplodeData ──────────────────────────────────────────────────────────────

type ExplodeData struct {
	ExplodeBombPositions  []types.MapIndex
	RuinBrickPositions    []types.MapIndex
	DestroyItemPositions  []types.MapIndex
	ShowFireConfigs       []objects.FireObjConfig
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

type PlaceBombPayload struct {
	ManKey    types.ManSpriteKey
	X         uint32
	Y         uint32
	BombPower uint32
}

type MovePayload struct {
	ManKey   types.ManSpriteKey
	NewX     uint32
	NewY     uint32
	Dir      types.ManDirection
	IsMoving bool
}

// ─── ObjManager ───────────────────────────────────────────────────────────────

type ObjManager struct {
	Players      []*objects.ManObj
	Map          MapMatrix
	Fires        []*objects.FireObj
	RuiningBricks []ruiningBrick
}

type ruiningBrick struct {
	Index       types.MapIndex
	RemainingMs uint32
}

func NewObjManager(mapMatrix MapMatrix, players []*objects.ManObj) *ObjManager {
	return &ObjManager{
		Players: players,
		Map:     mapMatrix,
	}
}

func (o *ObjManager) mapHeight() int { return len(o.Map) }
func (o *ObjManager) mapWidth() int {
	if len(o.Map) == 0 {
		return 0
	}
	return len(o.Map[0])
}

func (o *ObjManager) getTileKind(index types.MapIndex) TileKind {
	if int(index.IndexY) >= o.mapHeight() || int(index.IndexX) >= o.mapWidth() {
		return TileEmpty
	}
	return o.Map[index.IndexY][index.IndexX].Kind
}

func (o *ObjManager) cleanTile(index types.MapIndex) {
	if int(index.IndexY) < o.mapHeight() && int(index.IndexX) < o.mapWidth() {
		o.Map[index.IndexY][index.IndexX] = MapCell{Kind: TileEmpty}
	}
}

func (o *ObjManager) setTile(index types.MapIndex, cell MapCell) {
	if int(index.IndexY) < o.mapHeight() && int(index.IndexX) < o.mapWidth() {
		o.Map[index.IndexY][index.IndexX] = cell
	}
}

// ─── Tick helpers ─────────────────────────────────────────────────────────────

// TickFires decrements fire timers; returns (cx, cy) of expired fires.
func (o *ObjManager) TickFires(passMs uint32) [][2]int {
	var removed [][2]int
	kept := o.Fires[:0]
	for _, f := range o.Fires {
		if f.RemainingMs <= passMs {
			removed = append(removed, [2]int{f.Config.CenterX, f.Config.CenterY})
		} else {
			f.RemainingMs -= passMs
			kept = append(kept, f)
		}
	}
	o.Fires = kept
	return removed
}

func (o *ObjManager) TickRuiningBricks(passMs uint32) {
	kept := o.RuiningBricks[:0]
	for _, rb := range o.RuiningBricks {
		if rb.RemainingMs > passMs {
			rb.RemainingMs -= passMs
			kept = append(kept, rb)
		}
	}
	o.RuiningBricks = kept
}

// GetFireCells returns all tile coords currently on fire.
func (o *ObjManager) GetFireCells() [][2]uint32 {
	var cells [][2]uint32
	for _, f := range o.Fires {
		cx, cy := uint32(f.Config.CenterX), uint32(f.Config.CenterY)
		cells = append(cells, [2]uint32{cx, cy})
		for i := uint32(1); i <= uint32(f.Config.VerticalStart); i++ {
			if cy >= i {
				cells = append(cells, [2]uint32{cx, cy - i})
			}
		}
		for i := uint32(1); i <= uint32(f.Config.VerticalEnd); i++ {
			cells = append(cells, [2]uint32{cx, cy + i})
		}
		for i := uint32(1); i <= uint32(f.Config.HorizontalStart); i++ {
			if cx >= i {
				cells = append(cells, [2]uint32{cx - i, cy})
			}
		}
		for i := uint32(1); i <= uint32(f.Config.HorizontalEnd); i++ {
			cells = append(cells, [2]uint32{cx + i, cy})
		}
	}
	return cells
}

// ─── Explosion ────────────────────────────────────────────────────────────────

func (o *ObjManager) HandleGetExplodeBombData(passMs uint32) ExplodeData {
	result := ExplodeData{}

	// Tick bomb timers, collect expired
	for y, row := range o.Map {
		for x, cell := range row {
			if cell.Kind == TileBomb && cell.Bomb != nil {
				if cell.Bomb.RemainingMs <= passMs {
					cell.Bomb.RemainingMs = 0
					result.ExplodeBombPositions = append(result.ExplodeBombPositions, types.MapIndex{IndexX: uint32(x), IndexY: uint32(y)})
				} else {
					cell.Bomb.RemainingMs -= passMs
					o.Map[y][x].Bomb = cell.Bomb
				}
			}
		}
	}

	// Chain-reaction BFS
	processed := map[[2]uint32]bool{}
	queue := make([]types.MapIndex, len(result.ExplodeBombPositions))
	copy(queue, result.ExplodeBombPositions)

	dirs := [][2]int{{0, -1}, {0, 1}, {-1, 0}, {1, 0}} // up, down, left, right

	for len(queue) > 0 {
		pos := queue[0]
		queue = queue[1:]
		key := [2]uint32{pos.IndexX, pos.IndexY}
		if processed[key] {
			continue
		}
		processed[key] = true

		cell := o.Map[pos.IndexY][pos.IndexX]
		if cell.Kind != TileBomb || cell.Bomb == nil {
			continue
		}
		power := int(cell.Bomb.Power)

		spread := [4]int{}
		for di, d := range dirs {
			for i := 1; i <= power; i++ {
				tx := int(pos.IndexX) + d[0]*i
				ty := int(pos.IndexY) + d[1]*i
				if tx < 0 || ty < 0 || ty >= o.mapHeight() || tx >= o.mapWidth() {
					break
				}
				target := types.MapIndex{IndexX: uint32(tx), IndexY: uint32(ty)}
				kind := o.getTileKind(target)

				if kind == TileWall {
					break
				}
				if i > spread[di] {
					spread[di] = i
				}
				if kind == TileBrick {
					if !indexInList(result.RuinBrickPositions, target) {
						result.RuinBrickPositions = append(result.RuinBrickPositions, target)
					}
					break
				}
				if kind == TileItem {
					if !indexInList(result.DestroyItemPositions, target) {
						result.DestroyItemPositions = append(result.DestroyItemPositions, target)
					}
					break
				}
				if kind == TileBomb {
					tkey := [2]uint32{target.IndexX, target.IndexY}
					if !processed[tkey] && !indexInList(queue, target) {
						result.ExplodeBombPositions = append(result.ExplodeBombPositions, target)
						queue = append(queue, target)
					}
					break
				}
			}
		}

		result.ShowFireConfigs = append(result.ShowFireConfigs, objects.FireObjConfig{
			CenterX:         int(pos.IndexX),
			CenterY:         int(pos.IndexY),
			VerticalStart:   spread[0],
			VerticalEnd:     spread[1],
			HorizontalStart: spread[2],
			HorizontalEnd:   spread[3],
		})
	}

	return result
}

func (o *ObjManager) HandleRenderExplodeByData(data ExplodeData) []SpawnedItem {
	// Spawn fires
	for _, fc := range data.ShowFireConfigs {
		o.Fires = append(o.Fires, objects.NewFireObj(fc))
	}

	// Remove bombs, decrement usedBombNum
	for _, pos := range data.ExplodeBombPositions {
		cell := o.Map[pos.IndexY][pos.IndexX]
		if cell.Kind == TileBomb && cell.Bomb != nil {
			manKey := cell.Bomb.ManKey
			for _, p := range o.Players {
				if p.ManSpriteKey == manKey && p.UsedBombNum > 0 {
					p.UsedBombNum--
				}
			}
		}
		o.cleanTile(pos)
	}

	// Ruin bricks, possibly spawn items
	var spawned []SpawnedItem
	for _, pos := range data.RuinBrickPositions {
		o.cleanTile(pos)
		o.RuiningBricks = append(o.RuiningBricks, ruiningBrick{Index: pos, RemainingMs: config.BrickRuinCountdownMs})

		if rand.Intn(5) <= 2 { // 3/5 chance
			var itemType types.ItemType
			switch rand.Intn(3) {
			case 0:
				itemType = types.ItemSpeed
			case 1:
				itemType = types.ItemMoreBomb
			default:
				itemType = types.ItemFire
			}
			item := objects.NewItemObj(&pos, itemType)
			o.setTile(pos, MapCell{Kind: TileItem, Item: item})
			spawned = append(spawned, SpawnedItem{Index: pos, ItemType: itemType})
		}
	}

	// Destroy items caught in blast
	for _, pos := range data.DestroyItemPositions {
		o.cleanTile(pos)
	}

	return spawned
}

type SpawnedItem struct {
	Index    types.MapIndex
	ItemType types.ItemType
}

// ─── Item pickups ─────────────────────────────────────────────────────────────

type PickupResult struct {
	ManKey   types.ManSpriteKey
	Index    types.MapIndex
	ItemType types.ItemType
}

func (o *ObjManager) HandleItemPickups() []PickupResult {
	var results []PickupResult
	for _, p := range o.Players {
		if !p.IsAlive {
			continue
		}
		idx := p.Base.GetCenterMapIndex()
		cell := o.Map[idx.IndexY][idx.IndexX]
		if cell.Kind == TileItem && cell.Item != nil {
			it := cell.Item.ItemType
			p.EatItem(it)
			o.cleanTile(idx)
			results = append(results, PickupResult{ManKey: p.ManSpriteKey, Index: idx, ItemType: it})
		}
	}
	return results
}

// ─── Bomb placement ───────────────────────────────────────────────────────────

func (o *ObjManager) HandleSelfPlaceBomb(manKey types.ManSpriteKey) *PlaceBombPayload {
	var player *objects.ManObj
	for _, p := range o.Players {
		if p.ManSpriteKey == manKey {
			player = p
			break
		}
	}
	if player == nil || player.UsedBombNum >= player.BombNum {
		return nil
	}
	bombIndex := player.Base.GetCenterMapIndex()
	kind := o.getTileKind(bombIndex)
	if kind == TileBomb || kind == TileBrick || kind == TileWall {
		return nil
	}

	bomb := objects.NewBombObj(&bombIndex, player.BombPower, manKey)
	o.setTile(bombIndex, MapCell{Kind: TileBomb, Bomb: bomb})

	bombPos := types.Position{
		PosX: bombIndex.IndexX * config.TileWidth,
		PosY: bombIndex.IndexY * config.TileWidth,
	}
	player.CanPassBombPosList = append(player.CanPassBombPosList, bombPos)
	player.UsedBombNum++

	return &PlaceBombPayload{
		ManKey:    manKey,
		X:         bombIndex.IndexX,
		Y:         bombIndex.IndexY,
		BombPower: player.BombPower,
	}
}

// ─── Player movement ──────────────────────────────────────────────────────────

func (o *ObjManager) HandlePlayerPositionChange(manKey types.ManSpriteKey, dir types.ManDirection) *MovePayload {
	var player *objects.ManObj
	for _, p := range o.Players {
		if p.ManSpriteKey == manKey {
			player = p
			break
		}
	}
	if player == nil {
		return nil
	}

	prevX, prevY := player.Base.Position.PosX, player.Base.Position.PosY
	speed := player.Speed

	targetX, targetY := prevX, prevY
	switch dir {
	case types.DirUp:
		if targetY >= speed {
			targetY -= speed
		} else {
			targetY = 0
		}
	case types.DirDown:
		targetY += speed
	case types.DirLeft:
		if targetX >= speed {
			targetX -= speed
		} else {
			targetX = 0
		}
	case types.DirRight:
		targetX += speed
	}

	finalX, finalY := targetX, targetY
	canMove := o.canManMoveByPosition(finalX, finalY, player)

	if !canMove {
		tw := config.TileWidth
		switch dir {
		case types.DirLeft, types.DirRight:
			offset := prevY % tw
			if offset != 0 {
				if offset <= speed {
					finalY = prevY - offset
					finalX = targetX
				} else if tw-offset <= speed {
					finalY = prevY + (tw - offset)
					finalX = targetX
				}
				canMove = o.canManMoveByPosition(finalX, finalY, player)
			}
		case types.DirUp, types.DirDown:
			offset := prevX % tw
			if offset != 0 {
				if offset <= speed {
					finalX = prevX - offset
					finalY = targetY
				} else if tw-offset <= speed {
					finalX = prevX + (tw - offset)
					finalY = targetY
				}
				canMove = o.canManMoveByPosition(finalX, finalY, player)
			}
		}

		if !canMove {
			tw := config.TileWidth
			switch dir {
			case types.DirUp:
				finalY = ((targetY + tw - 1) / tw) * tw
			case types.DirDown:
				finalY = (targetY / tw) * tw
			case types.DirLeft:
				finalX = ((targetX + tw - 1) / tw) * tw
			case types.DirRight:
				finalX = (targetX / tw) * tw
			}
			canMove = o.canManMoveByPosition(finalX, finalY, player)
		}
	}

	o.handleCanPassBomb(manKey, finalX, finalY)

	player.Base.Position.PosX = finalX
	player.Base.Position.PosY = finalY
	player.Dir = dir
	player.IsMoving = true

	if canMove {
		return &MovePayload{ManKey: manKey, NewX: finalX, NewY: finalY, Dir: dir, IsMoving: true}
	}
	return nil
}

func (o *ObjManager) handleCanPassBomb(manKey types.ManSpriteKey, finalX, finalY uint32) {
	var player *objects.ManObj
	for _, p := range o.Players {
		if p.ManSpriteKey == manKey {
			player = p
			break
		}
	}
	if player == nil {
		return
	}
	tw := uint64(config.TileWidth)
	kept := player.CanPassBombPosList[:0]
	for _, bp := range player.CanPassBombPosList {
		dx := absDiff(uint64(bp.PosX), uint64(finalX))
		dy := absDiff(uint64(bp.PosY), uint64(finalY))
		if dx < tw && dy < tw {
			kept = append(kept, bp)
		}
	}
	player.CanPassBombPosList = kept
}

func (o *ObjManager) canManMoveByPosition(posX, posY uint32, man *objects.ManObj) bool {
	tw := config.TileWidth
	corners := [][2]uint32{
		{posX, posY},
		{posX + tw - 1, posY},
		{posX, posY + tw - 1},
		{posX + tw - 1, posY + tw - 1},
	}
	for _, c := range corners {
		ix, iy := c[0]/tw, c[1]/tw
		kind := o.getTileKind(types.MapIndex{IndexX: ix, IndexY: iy})
		switch kind {
		case TileWall, TileBrick:
			return false
		case TileBomb:
			// Can pass if player placed it and still overlaps
			canPass := false
			for _, bp := range man.CanPassBombPosList {
				if c[0] >= bp.PosX && c[0] < bp.PosX+tw &&
					c[1] >= bp.PosY && c[1] < bp.PosY+tw {
					canPass = true
					break
				}
			}
			if !canPass {
				return false
			}
		}
	}
	return true
}

func (o *ObjManager) HandlePlayerDie(manKey types.ManSpriteKey) {
	for _, p := range o.Players {
		if p.ManSpriteKey == manKey {
			p.IsAlive = false
			return
		}
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func indexInList(list interface{}, target types.MapIndex) bool {
	switch l := list.(type) {
	case []types.MapIndex:
		for _, v := range l {
			if v.IndexX == target.IndexX && v.IndexY == target.IndexY {
				return true
			}
		}
	}
	return false
}

func absDiff(a, b uint64) uint64 {
	if a > b {
		return a - b
	}
	return b - a
}
