package game

import (
	"log"
	"time"

	"bomberman-backend/internal/ws/message"
)

// SendFn is a callback the actor uses to deliver messages to clients.
type SendFn func(clientID uint32, msg []byte)

// BroadcastFn broadcasts to all clients in this game.
type BroadcastFn func(clientIDs []uint32, msg []byte)

// Actor is the game event loop. Start it in a goroutine.
type Actor struct {
	gameID    uint32
	manager   *Manager
	state     *GameState
	ch        chan any // receives game.Command
	clientIDs []uint32 // all participating client IDs

	send      SendFn
	broadcast BroadcastFn
	onDone    func(gameID uint32)
}

func NewActor(
	gameID uint32,
	gs *GameState,
	clientIDs []uint32,
	ch chan any,
	send SendFn,
	broadcast BroadcastFn,
	onDone func(uint32),
) *Actor {
	return &Actor{
		gameID:    gameID,
		manager:   NewManager(gs),
		state:     gs,
		ch:        ch,
		clientIDs: clientIDs,
		send:      send,
		broadcast: broadcast,
		onDone:    onDone,
	}
}

func (a *Actor) Run() {
	ticker := time.NewTicker(TickIntervalMs * time.Millisecond)
	defer ticker.Stop()

	log.Printf("[game %d] started", a.gameID)

	for {
		select {
		case raw, ok := <-a.ch:
			if !ok {
				return
			}
			if cmd, ok := raw.(Command); ok {
				a.manager.QueueCommand(cmd)
			}
		case <-ticker.C:
			if a.state.GameOver {
				log.Printf("[game %d] ended", a.gameID)
				if a.onDone != nil {
					a.onDone(a.gameID)
				}
				return
			}
			events := a.manager.Tick()
			a.dispatchEvents(events)
		}
	}
}

func (a *Actor) dispatchEvents(events []Event) {
	for _, evt := range events {
		switch evt.Type {
		case EvtPlayerMove:
			d := evt.PlayerMove
			msg := message.MustEncode("playerMove", message.PlayerMoveOutPayload{
				ManKey:   d.ManKey,
				NewX:     float64(d.X),
				NewY:     float64(d.Y),
				Dir:      d.Dir,
				IsMoving: d.IsMoving,
			})
			a.broadcast(a.clientIDs, msg)

		case EvtGenerateBomb:
			d := evt.GenerateBomb
			msg := message.MustEncode("generateBomb", message.GenerateBombOutPayload{
				ManKey:      d.ManKey,
				X:           float64(d.X),
				Y:           float64(d.Y),
				BombPower:   d.Power,
				ExplodeAtMs: d.ExplodeAtMs,
			})
			a.broadcast(a.clientIDs, msg)

		case EvtBombExplode:
			d := evt.BombExplode
			msg := message.MustEncode("bombExplode", message.BombExplodePayload{
				ManKey: d.ManKey, X: d.X, Y: d.Y, Power: d.Power,
			})
			a.broadcast(a.clientIDs, msg)

		case EvtCreateItem:
			d := evt.CreateItem
			msg := message.MustEncode("createItem", message.CreateItemPayload{
				Item: d.Item, X: d.X, Y: d.Y,
			})
			a.broadcast(a.clientIDs, msg)

		case EvtItemEaten:
			d := evt.ItemEaten
			msg := message.MustEncode("itemEaten", message.ItemEatenPayload{
				ManKey: d.ManKey, Item: d.Item, X: d.X, Y: d.Y,
			})
			a.broadcast(a.clientIDs, msg)

		case EvtPlayerDie:
			d := evt.PlayerDie
			msg := message.MustEncode("playerDie", message.PlayerDiePayload{ManKey: d.ManKey})
			a.broadcast(a.clientIDs, msg)

		case EvtTimeSyncPong:
			d := evt.TimeSyncPong
			msg := message.MustEncode("timeSyncPong", message.TimeSyncPongPayload{
				SentAt:     d.SentAt,
				ServerTime: d.ServerTime,
				From:       d.From,
			})
			if d.ClientID != 0 {
				a.send(d.ClientID, msg)
			}

		case EvtGameOver:
			d := evt.GameOver
			msg := message.MustEncode("gameOver", message.GameOverPayload{Winner: d.Winner})
			a.broadcast(a.clientIDs, msg)
		}
	}
}
