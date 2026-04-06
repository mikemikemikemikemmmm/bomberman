package game

import (
	"math/rand"
	"time"

	gamemap "bomberman-backend/internal/game/map"
)

// Manager runs the game logic against a GameState each tick.
type Manager struct {
	state    *GameState
	commands []Command
}

func NewManager(gs *GameState) *Manager {
	return &Manager{state: gs}
}

func (m *Manager) QueueCommand(cmd Command) {
	m.state.Lock()
	m.commands = append(m.commands, cmd)
	m.state.Unlock()
}

// Tick processes one game tick and returns a list of outgoing events.
func (m *Manager) Tick() []Event {
	m.state.Lock()
	defer m.state.Unlock()

	cmds := m.commands
	m.commands = nil

	var events []Event

	events = append(events, m.consumeCommands(cmds)...)
	events = append(events, m.handleBombExplode()...)
	events = append(events, m.handlePlayerEatItems()...)
	events = append(events, m.handlePlayerDie()...)
	if e, done := m.handleGameOver(); done {
		events = append(events, e...)
		m.state.GameOver = true
	}
	return events
}

// consumeCommands applies each queued command and emits events.
func (m *Manager) consumeCommands(cmds []Command) []Event {
	var events []Event
	for _, cmd := range cmds {
		switch cmd.Type {
		case CmdPlayerMove:
			p := cmd.PlayerMove
			if player, ok := m.state.Players[p.ManKey]; ok && player.IsAlive() {
				nx, ny := uint32(p.NewX), uint32(p.NewY)
				if m.canMoveTo(nx, ny) {
					player.SetPosition(nx, ny)
					player.SetMoving(p.IsMoving, p.Dir)
				}
				events = append(events, Event{Type: EvtPlayerMove, PlayerMove: &EvtPlayerMoveData{
					ManKey: p.ManKey, X: nx, Y: ny, Dir: p.Dir, IsMoving: p.IsMoving,
				}})
			}
		case CmdGenerateBomb:
			p := cmd.GenerateBomb
			if player, ok := m.state.Players[p.ManKey]; ok && player.IsAlive() {
				bx, by := snapToGrid(int(p.X)), snapToGrid(int(p.Y))
				if !m.hasBombAt(bx, by) {
					explodeAt := nowMs() + BombFuseMs
					m.state.ActiveBombs = append(m.state.ActiveBombs, ActiveBomb{
						ManKey:      p.ManKey,
						X:           bx,
						Y:           by,
						Power:       int(player.BombPower()),
						ExplodeAtMs: explodeAt,
					})
					events = append(events, Event{Type: EvtGenerateBomb, GenerateBomb: &EvtGenerateBombData{
						ManKey: p.ManKey, X: bx, Y: by, Power: int(player.BombPower()), ExplodeAtMs: explodeAt,
					}})
				}
			}
		case CmdTimeSyncPing:
			p := cmd.TimeSyncPing
			events = append(events, Event{Type: EvtTimeSyncPong, TimeSyncPong: &EvtTimeSyncPongData{
				SentAt:     p.SentAt,
				ServerTime: nowMs(),
				From:       p.From,
				ClientID:   m.clientIDForName(p.From),
			}})
		case CmdPlayerDisconnected:
			if id := cmd.PlayerDisconnect; id != nil {
				for _, player := range m.state.Players {
					if player.ClientID == *id {
						player.SetAlive(false)
						m.state.PendingDeaths = append(m.state.PendingDeaths, player.ManKey)
					}
				}
			}
		}
	}
	return events
}

// handleBombExplode detonates any bombs whose timer has expired.
func (m *Manager) handleBombExplode() []Event {
	now := nowMs()
	var remaining []ActiveBomb
	var events []Event

	for _, bomb := range m.state.ActiveBombs {
		if now < bomb.ExplodeAtMs {
			remaining = append(remaining, bomb)
			continue
		}
		// Detonate
		events = append(events, Event{Type: EvtBombExplode, BombExplode: &EvtBombExplodeData{
			ManKey: bomb.ManKey, X: bomb.X, Y: bomb.Y, Power: bomb.Power,
		}})

		// Determine blast cells in 4 directions
		blastCells := m.calcBlast(bomb.X, bomb.Y, bomb.Power)

		// Kill players in blast
		for _, player := range m.state.Players {
			if !player.IsAlive() {
				continue
			}
			px, py := snapToGrid(int(player.X())), snapToGrid(int(player.Y()))
			for _, bc := range blastCells {
				if bc[0] == px && bc[1] == py {
					player.SetAlive(false)
					m.state.PendingDeaths = append(m.state.PendingDeaths, player.ManKey)
					break
				}
			}
		}

		// Destroy bricks and maybe spawn items
		for _, bc := range blastCells {
			tx, ty := gridIndex(bc[0]), gridIndex(bc[1])
			if tx >= 0 && tx < gamemap.MapSize && ty >= 0 && ty < gamemap.MapSize {
				if m.state.MapMatrix[ty][tx] == gamemap.CellBrick {
					m.state.MapMatrix[ty][tx] = gamemap.CellEmpty
					// Random chance to spawn item
					if rand.Intn(3) == 0 {
						item := randomItem()
						m.state.ActiveItems = append(m.state.ActiveItems, ActiveItem{
							Item: item, X: bc[0], Y: bc[1],
						})
						events = append(events, Event{Type: EvtCreateItem, CreateItem: &EvtCreateItemData{
							Item: item, X: bc[0], Y: bc[1],
						}})
					}
				}
			}
		}
	}
	m.state.ActiveBombs = remaining
	return events
}

// handlePlayerEatItems checks if any player is standing on an item.
func (m *Manager) handlePlayerEatItems() []Event {
	var remaining []ActiveItem
	for _, item := range m.state.ActiveItems {
		eaten := false
		for _, player := range m.state.Players {
			if !player.IsAlive() {
				continue
			}
			px, py := snapToGrid(int(player.X())), snapToGrid(int(player.Y()))
			if px == item.X && py == item.Y {
				// Apply effect
				switch item.Item {
				case ItemFire:
					player.IncrBombPower()
				case ItemSpeed:
					player.IncrSpeed()
				case ItemMoreBomb:
					player.IncrBombNum()
				}
				m.state.PendingItemEats = append(m.state.PendingItemEats, ItemEatenPayload{
					ManKey: player.ManKey, Item: item.Item, X: item.X, Y: item.Y,
				})
				eaten = true
				break
			}
		}
		if !eaten {
			remaining = append(remaining, item)
		}
	}
	m.state.ActiveItems = remaining

	var events []Event
	for _, ie := range m.state.PendingItemEats {
		events = append(events, Event{Type: EvtItemEaten, ItemEaten: &EvtItemEatenData{
			ManKey: ie.ManKey, Item: ie.Item, X: ie.X, Y: ie.Y,
		}})
	}
	m.state.PendingItemEats = nil
	return events
}

// handlePlayerDie broadcasts pending deaths.
func (m *Manager) handlePlayerDie() []Event {
	var events []Event
	for _, key := range m.state.PendingDeaths {
		events = append(events, Event{Type: EvtPlayerDie, PlayerDie: &EvtPlayerDieData{ManKey: key}})
	}
	m.state.PendingDeaths = nil
	return events
}

// handleGameOver checks win/time conditions.
func (m *Manager) handleGameOver() ([]Event, bool) {
	if m.state.GameOver {
		return nil, false
	}
	if nowMs() >= m.state.GameEndTimeMs {
		winner := m.findWinner()
		return []Event{{Type: EvtGameOver, GameOver: &EvtGameOverData{Winner: winner}}}, true
	}
	alive := m.alivePlayers()
	if len(alive) <= 1 {
		var winner *ManSpriteKey
		if len(alive) == 1 {
			k := alive[0].ManKey
			winner = &k
		}
		return []Event{{Type: EvtGameOver, GameOver: &EvtGameOverData{Winner: winner}}}, true
	}
	return nil, false
}

// --- helpers ---

func (m *Manager) canMoveTo(x, y uint32) bool {
	tx, ty := gridIndex(int(x)), gridIndex(int(y))
	if tx < 0 || tx >= gamemap.MapSize || ty < 0 || ty >= gamemap.MapSize {
		return false
	}
	cell := m.state.MapMatrix[ty][tx]
	return cell == gamemap.CellEmpty ||
		cell == gamemap.CellMan1 ||
		cell == gamemap.CellMan2 ||
		cell == gamemap.CellMan3 ||
		cell == gamemap.CellMan4
}

func (m *Manager) hasBombAt(x, y int) bool {
	for _, b := range m.state.ActiveBombs {
		if b.X == x && b.Y == y {
			return true
		}
	}
	return false
}

func (m *Manager) calcBlast(bx, by, power int) [][2]int {
	cells := [][2]int{{bx, by}}
	dirs := [][2]int{{0, -TileWidth}, {0, TileWidth}, {-TileWidth, 0}, {TileWidth, 0}}
	for _, d := range dirs {
		for i := 1; i <= power; i++ {
			cx, cy := bx+d[0]*i, by+d[1]*i
			tx, ty := gridIndex(cx), gridIndex(cy)
			if tx < 0 || tx >= gamemap.MapSize || ty < 0 || ty >= gamemap.MapSize {
				break
			}
			cell := m.state.MapMatrix[ty][tx]
			if cell == gamemap.CellWall {
				break
			}
			cells = append(cells, [2]int{cx, cy})
			if cell == gamemap.CellBrick {
				break // blast stops at brick
			}
		}
	}
	return cells
}

func (m *Manager) alivePlayers() []*Player {
	var alive []*Player
	for _, p := range m.state.Players {
		if p.IsAlive() {
			alive = append(alive, p)
		}
	}
	return alive
}

func (m *Manager) findWinner() *ManSpriteKey {
	alive := m.alivePlayers()
	if len(alive) == 1 {
		k := alive[0].ManKey
		return &k
	}
	return nil
}

func (m *Manager) clientIDForName(name string) uint32 {
	for _, p := range m.state.Players {
		if p.Name == name {
			return p.ClientID
		}
	}
	return 0
}

func snapToGrid(px int) int {
	return (px / TileWidth) * TileWidth
}

func gridIndex(px int) int {
	return px / TileWidth
}

func nowMs() int64 {
	return time.Now().UnixMilli()
}

func randomItem() ItemType {
	items := []ItemType{ItemFire, ItemSpeed, ItemMoreBomb}
	return items[rand.Intn(len(items))]
}
