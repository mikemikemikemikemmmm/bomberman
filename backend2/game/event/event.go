package event

import (
	"encoding/json"
	"fmt"
	"time"

	"bomberman/backend2/config"
	"bomberman/backend2/game/manager"
	"bomberman/backend2/game/mapdata"
	"bomberman/backend2/game/objects"
	"bomberman/backend2/state"
	"bomberman/backend2/types"
)

func nowMs() uint64 {
	return uint64(time.Now().UnixMilli())
}

// ─── EventManager ─────────────────────────────────────────────────────────────

type EventManager struct {
	objManager   *manager.ObjManager
	GameEndTime  uint64
	GameOver     bool
	clientManMap map[uint32]types.ManSpriteKey // clientID -> ManSpriteKey
	playerIDs    []uint32
}

func NewEventManager(mapData *mapdata.MapData, players []types.PlayerInfo) *EventManager {
	manKeys := make([]types.ManSpriteKey, len(players))
	for i, p := range players {
		manKeys[i] = p.ManSpriteKey
	}

	mapMatrix, manObjs := manager.InitMapAndPlayers(mapData, manKeys)
	objMgr := manager.NewObjManager(mapMatrix, manObjs)

	clientManMap := map[uint32]types.ManSpriteKey{}
	playerIDs := make([]uint32, 0, len(players))
	for _, p := range players {
		clientManMap[p.ID] = p.ManSpriteKey
		playerIDs = append(playerIDs, p.ID)
	}

	return &EventManager{
		objManager:   objMgr,
		GameEndTime:  nowMs() + config.GameDurationMs,
		GameOver:     false,
		clientManMap: clientManMap,
		playerIDs:    playerIDs,
	}
}

// ConsumeCommands processes queued commands, runs one game tick, and broadcasts changes.
func (em *EventManager) ConsumeCommands(commands []state.GameCommand, appState *state.AppState) {
	changes := &gameStateChangedPayload{}

	// 1. Handle commands
	for _, cmd := range commands {
		fmt.Println(cmd)
		switch cmd.Kind {
		case state.GamePlayerMove:
			if cmd.Move != nil {
				em.handlePlayerMove(cmd.Move, changes)
			}
		case state.GameGenerateBomb:
			if cmd.Bomb != nil {
				em.handleGenerateBomb(cmd.Bomb, changes)
			}
		case state.GamePlayerDisconnected:
			em.handlePlayerDisconnected(cmd.ClientID, changes)
		case state.GameTimeSyncPing:
			em.handleTimeSyncPing(cmd.ClientID, cmd.SentAt, appState)
		}
	}

	// 2. Tick fires
	removedFires := em.objManager.TickFires(config.GameTickMs)
	for _, rf := range removedFires {
		changes.RemovedFires = append(changes.RemovedFires, gridPos{X: rf[0], Y: rf[1]})
	}
	em.objManager.TickRuiningBricks(config.GameTickMs)

	// 3. Explosions
	explodeData := em.objManager.HandleGetExplodeBombData(config.GameTickMs)
	for _, fc := range explodeData.ShowFireConfigs {
		changes.BombExplosions = append(changes.BombExplosions, bombExplodePayload{
			X:     fc.CenterX,
			Y:     fc.CenterY,
			Cells: fireConfigToGridPos(fc),
		})
	}
	for _, pos := range explodeData.DestroyItemPositions {
		changes.RemovedItems = append(changes.RemovedItems, gridPos{X: int(pos.IndexX), Y: int(pos.IndexY)})
	}

	spawned := em.objManager.HandleRenderExplodeByData(explodeData)
	for _, s := range spawned {
		changes.NewItems = append(changes.NewItems, createItemPayload{
			X:        int(s.Index.IndexX),
			Y:        int(s.Index.IndexY),
			ItemType: string(s.ItemType),
		})
	}

	// 4. Fire deaths
	fireCells := em.objManager.GetFireCells()
	tw := config.TileWidth
	for _, p := range em.objManager.Players {
		if !p.IsAlive {
			continue
		}
		pos := p.Base.GetPosition()
		tx := pos.PosX / tw
		ty := pos.PosY / tw
		for _, fc := range fireCells {
			if fc[0] == tx && fc[1] == ty {
				p.IsAlive = false
				changes.PlayerDeaths = append(changes.PlayerDeaths, string(p.ManSpriteKey))
				break
			}
		}
	}

	// 5. Item pickups
	for _, pickup := range em.objManager.HandleItemPickups() {
		changes.ItemsEaten = append(changes.ItemsEaten, itemEatenPayload{
			ManKey:   string(pickup.ManKey),
			X:        int(pickup.Index.IndexX),
			Y:        int(pickup.Index.IndexY),
			ItemType: string(pickup.ItemType),
		})
	}

	// 6. Game-over check
	em.checkGameOver(changes)

	// 7. Broadcast
	if !changes.isEmpty() {
		msg := makeWsMsgGameStateChanged(changes)
		for _, id := range em.playerIDs {
			appState.SendToClient(id, msg)
		}
	}
}

// ─── Command handlers ─────────────────────────────────────────────────────────

func (em *EventManager) handlePlayerMove(p *state.PlayerMovePayload, changes *gameStateChangedPayload) {
	print(changes, 12)
	alive := false
	for _, pl := range em.objManager.Players {
		if pl.ManSpriteKey == p.ManKey {
			alive = pl.IsAlive
			break
		}
	}
	if !alive {
		return
	}

	mv := em.objManager.HandlePlayerPositionChange(p.ManKey, p.Dir)
	if mv != nil {
		changes.PlayerMoves = append(changes.PlayerMoves, playerMovePayload{
			ManKey:   string(mv.ManKey),
			NewX:     mv.NewX,
			NewY:     mv.NewY,
			Dir:      string(mv.Dir),
			IsMoving: mv.IsMoving,
		})
	}
}

func (em *EventManager) handleGenerateBomb(p *state.GenerateBombPayload, changes *gameStateChangedPayload) {
	alive := false
	for _, pl := range em.objManager.Players {
		if pl.ManSpriteKey == p.ManKey {
			alive = pl.IsAlive
			break
		}
	}
	if !alive {
		return
	}

	placed := em.objManager.HandleSelfPlaceBomb(p.ManKey)
	if placed != nil {
		changes.NewBombs = append(changes.NewBombs, generateBombPayload{
			ManKey:    string(placed.ManKey),
			X:         int(placed.X),
			Y:         int(placed.Y),
			BombPower: placed.BombPower,
		})
	}
}

func (em *EventManager) handlePlayerDisconnected(clientID uint32, changes *gameStateChangedPayload) {
	manKey, ok := em.clientManMap[clientID]
	if !ok {
		return
	}
	em.objManager.HandlePlayerDie(manKey)
	changes.PlayerDeaths = append(changes.PlayerDeaths, string(manKey))
}

func (em *EventManager) handleTimeSyncPing(clientID uint32, sentAt int64, appState *state.AppState) {
	manKey, ok := em.clientManMap[clientID]
	to := ""
	if ok {
		to = string(manKey)
	}
	msg := makeWsMsg("timeSyncPong", map[string]interface{}{
		"sentAt": sentAt,
		"to":     to,
	})
	appState.SendToClient(clientID, msg)
}

func (em *EventManager) checkGameOver(changes *gameStateChangedPayload) {
	if em.GameOver {
		return
	}

	var alive []types.ManSpriteKey
	for _, p := range em.objManager.Players {
		if p.IsAlive {
			alive = append(alive, p.ManSpriteKey)
		}
	}

	if nowMs() >= em.GameEndTime {
		em.GameOver = true
		var winner *string
		if len(alive) == 1 {
			w := string(alive[0])
			winner = &w
		}
		changes.GameOver = winner
	} else if len(alive) <= 1 {
		em.GameOver = true
		var winner *string
		if len(alive) == 1 {
			w := string(alive[0])
			winner = &w
		}
		changes.GameOver = winner
	}
}

// ─── Message payloads ─────────────────────────────────────────────────────────

type gridPos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type playerMovePayload struct {
	ManKey   string `json:"manKey"`
	NewX     uint32 `json:"newX"`
	NewY     uint32 `json:"newY"`
	Dir      string `json:"dir"`
	IsMoving bool   `json:"isMoving"`
}

type generateBombPayload struct {
	ManKey    string `json:"manSpriteKey"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	BombPower uint32 `json:"bombPower"`
}

type bombExplodePayload struct {
	X     int       `json:"x"`
	Y     int       `json:"y"`
	Cells []gridPos `json:"cells"`
}

type createItemPayload struct {
	X        int    `json:"x"`
	Y        int    `json:"y"`
	ItemType string `json:"itemType"`
}

type itemEatenPayload struct {
	ManKey   string `json:"manKey"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	ItemType string `json:"itemType"`
}

type gameStateChangedPayload struct {
	PlayerMoves    []playerMovePayload
	NewBombs       []generateBombPayload
	BombExplosions []bombExplodePayload
	NewItems       []createItemPayload
	RemovedItems   []gridPos
	RemovedFires   []gridPos
	PlayerDeaths   []string
	ItemsEaten     []itemEatenPayload
	GameOver       *string // nil = no game over; &"" = draw; &"man1" = winner
}

func (c *gameStateChangedPayload) isEmpty() bool {
	return len(c.PlayerMoves) == 0 &&
		len(c.NewBombs) == 0 &&
		len(c.BombExplosions) == 0 &&
		len(c.NewItems) == 0 &&
		len(c.RemovedItems) == 0 &&
		len(c.RemovedFires) == 0 &&
		len(c.PlayerDeaths) == 0 &&
		len(c.ItemsEaten) == 0 &&
		c.GameOver == nil
}

// ─── Wire message builders ────────────────────────────────────────────────────

func makeWsMsg(msgType string, payload interface{}) []byte {
	b, _ := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	return b
}

func makeWsMsgGameStateChanged(c *gameStateChangedPayload) []byte {
	var events []map[string]interface{}

	for _, pm := range c.PlayerMoves {
		events = append(events, map[string]interface{}{
			"type": "playerMove",
			"payload": map[string]interface{}{
				"manKey":   pm.ManKey,
				"newX":     pm.NewX,
				"newY":     pm.NewY,
				"dir":      pm.Dir,
				"isMoving": pm.IsMoving,
			},
		})
	}

	for _, b := range c.NewBombs {
		events = append(events, map[string]interface{}{
			"type": "generateBomb",
			"payload": map[string]interface{}{
				"manSpriteKey": b.ManKey,
				"x":            b.X,
				"y":            b.Y,
				"bombPower":    b.BombPower,
			},
		})
	}

	for _, ex := range c.BombExplosions {
		events = append(events, map[string]interface{}{
			"type": "bombExplode",
			"payload": map[string]interface{}{
				"x":     ex.X,
				"y":     ex.Y,
				"cells": ex.Cells,
			},
		})
	}

	for _, it := range c.NewItems {
		events = append(events, map[string]interface{}{
			"type": "createItem",
			"payload": map[string]interface{}{
				"x":        it.X,
				"y":        it.Y,
				"itemType": it.ItemType,
			},
		})
	}

	for _, ri := range c.RemovedItems {
		events = append(events, map[string]interface{}{
			"type":    "removeItem",
			"payload": map[string]interface{}{"x": ri.X, "y": ri.Y},
		})
	}

	for _, rf := range c.RemovedFires {
		events = append(events, map[string]interface{}{
			"type":    "removeFire",
			"payload": map[string]interface{}{"x": rf.X, "y": rf.Y},
		})
	}

	for _, ie := range c.ItemsEaten {
		events = append(events, map[string]interface{}{
			"type":    "removeItem",
			"payload": map[string]interface{}{"x": ie.X, "y": ie.Y},
		})
		events = append(events, map[string]interface{}{
			"type": "playerGetItem",
			"payload": map[string]interface{}{
				"x":        ie.X,
				"y":        ie.Y,
				"manKey":   ie.ManKey,
				"itemType": ie.ItemType,
			},
		})
	}

	if len(c.PlayerDeaths) > 0 {
		deaths := make([]map[string]interface{}, len(c.PlayerDeaths))
		for i, d := range c.PlayerDeaths {
			deaths[i] = map[string]interface{}{"manKey": d}
		}
		events = append(events, map[string]interface{}{
			"type":    "playerDie",
			"payload": deaths,
		})
	}

	if c.GameOver != nil {
		events = append(events, map[string]interface{}{"type": "gameOver"})
	}

	return makeWsMsg("gameStateChanged", events)
}

// fireConfigToGridPos converts a FireObjConfig into the list of affected cells.
func fireConfigToGridPos(fc objects.FireObjConfig) []gridPos {
	cells := []gridPos{{X: fc.CenterX, Y: fc.CenterY}}
	for i := 1; i <= fc.VerticalStart; i++ {
		cells = append(cells, gridPos{X: fc.CenterX, Y: fc.CenterY - i})
	}
	for i := 1; i <= fc.VerticalEnd; i++ {
		cells = append(cells, gridPos{X: fc.CenterX, Y: fc.CenterY + i})
	}
	for i := 1; i <= fc.HorizontalStart; i++ {
		cells = append(cells, gridPos{X: fc.CenterX - i, Y: fc.CenterY})
	}
	for i := 1; i <= fc.HorizontalEnd; i++ {
		cells = append(cells, gridPos{X: fc.CenterX + i, Y: fc.CenterY})
	}
	return cells
}
