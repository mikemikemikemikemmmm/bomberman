package state

import (
	"sync"
	"sync/atomic"
)

// ClientEntry represents a connected WebSocket client.
type ClientEntry struct {
	ID     uint32
	SendCh chan []byte
	RoomID *uint32
	GameID *uint32
	Name   string
}

// AppState is the global server state.
type AppState struct {
	nextClientID atomic.Uint32
	nextRoomID   atomic.Uint32

	// uint32 -> *ClientEntry
	clients sync.Map
	// uint32 -> chan<- (game.Command or room.Command); stored as any
	rooms sync.Map
	games sync.Map

	LobbyCh chan any // receives lobby.Command
}

var (
	once     sync.Once
	instance *AppState
)

func Get() *AppState {
	once.Do(func() {
		instance = &AppState{
			LobbyCh: make(chan any, 256),
		}
	})
	return instance
}

func (s *AppState) NextClientID() uint32 {
	return s.nextClientID.Add(1)
}

func (s *AppState) NextRoomID() uint32 {
	return s.nextRoomID.Add(1)
}

func (s *AppState) AddClient(c *ClientEntry) {
	s.clients.Store(c.ID, c)
}

func (s *AppState) RemoveClient(id uint32) {
	s.clients.Delete(id)
}

func (s *AppState) GetClient(id uint32) (*ClientEntry, bool) {
	v, ok := s.clients.Load(id)
	if !ok {
		return nil, false
	}
	return v.(*ClientEntry), true
}

func (s *AppState) SendToClient(id uint32, msg []byte) {
	if c, ok := s.GetClient(id); ok {
		select {
		case c.SendCh <- msg:
		default:
		}
	}
}

func (s *AppState) Broadcast(msg []byte) {
	s.clients.Range(func(_, v any) bool {
		entry := v.(*ClientEntry)
		select {
		case entry.SendCh <- msg:
		default:
		}
		return true
	})
}

func (s *AppState) AddRoom(roomID uint32, ch chan any) {
	s.rooms.Store(roomID, ch)
}

func (s *AppState) RemoveRoom(roomID uint32) {
	s.rooms.Delete(roomID)
}

func (s *AppState) GetRoomCh(roomID uint32) (chan any, bool) {
	v, ok := s.rooms.Load(roomID)
	if !ok {
		return nil, false
	}
	return v.(chan any), true
}

func (s *AppState) SendToRoom(roomID uint32, cmd any) {
	if ch, ok := s.GetRoomCh(roomID); ok {
		select {
		case ch <- cmd:
		default:
		}
	}
}

func (s *AppState) AllRooms(fn func(roomID uint32, ch chan any)) {
	s.rooms.Range(func(k, v any) bool {
		fn(k.(uint32), v.(chan any))
		return true
	})
}

func (s *AppState) AddGame(gameID uint32, ch chan any) {
	s.games.Store(gameID, ch)
}

func (s *AppState) RemoveGame(gameID uint32) {
	s.games.Delete(gameID)
}

func (s *AppState) GetGameCh(gameID uint32) (chan any, bool) {
	v, ok := s.games.Load(gameID)
	if !ok {
		return nil, false
	}
	return v.(chan any), true
}

func (s *AppState) SendToGame(gameID uint32, cmd any) {
	if ch, ok := s.GetGameCh(gameID); ok {
		select {
		case ch <- cmd:
		default:
		}
	}
}
