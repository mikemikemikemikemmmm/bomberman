package game

import (
	"sync"
	"sync/atomic"
)

// Player holds the mutable state of a single player.
// Numeric fields use atomics; direction uses a mutex-protected value.
type Player struct {
	Name     string
	ClientID uint32

	isAlive   atomic.Bool
	bombNum   atomic.Uint32
	bombPower atomic.Uint32
	speed     atomic.Uint32
	x         atomic.Uint32
	y         atomic.Uint32
	isMoving  atomic.Bool

	dirMu sync.RWMutex
	dir   Direction

	ManKey ManSpriteKey
}

func NewPlayer(name string, clientID uint32, manKey ManSpriteKey, spawnX, spawnY uint32) *Player {
	p := &Player{
		Name:     name,
		ClientID: clientID,
		ManKey:   manKey,
	}
	p.isAlive.Store(true)
	p.bombNum.Store(InitBombNum)
	p.bombPower.Store(InitBombPower)
	p.speed.Store(InitSpeed)
	p.x.Store(spawnX)
	p.y.Store(spawnY)
	p.isMoving.Store(false)
	p.dir = DirDown
	return p
}

func (p *Player) IsAlive() bool         { return p.isAlive.Load() }
func (p *Player) SetAlive(v bool)       { p.isAlive.Store(v) }
func (p *Player) BombNum() uint32       { return p.bombNum.Load() }
func (p *Player) BombPower() uint32     { return p.bombPower.Load() }
func (p *Player) Speed() uint32         { return p.speed.Load() }
func (p *Player) X() uint32             { return p.x.Load() }
func (p *Player) Y() uint32             { return p.y.Load() }
func (p *Player) IsMoving() bool        { return p.isMoving.Load() }

func (p *Player) SetPosition(x, y uint32) {
	p.x.Store(x)
	p.y.Store(y)
}

func (p *Player) SetMoving(moving bool, dir Direction) {
	p.isMoving.Store(moving)
	p.dirMu.Lock()
	p.dir = dir
	p.dirMu.Unlock()
}

func (p *Player) Dir() Direction {
	p.dirMu.RLock()
	defer p.dirMu.RUnlock()
	return p.dir
}

func (p *Player) IncrBombPower() { p.bombPower.Add(1) }
func (p *Player) IncrSpeed()     { p.speed.Add(1) }
func (p *Player) IncrBombNum()   { p.bombNum.Add(1) }
