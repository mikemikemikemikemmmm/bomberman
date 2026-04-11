package state

import (
	"sync"
	"sync/atomic"

	"bomberman/backend2/types"
)

// ─── Command types ────────────────────────────────────────────────────────────

type LobbyCommandKind int

const (
	LobbyClientJoined LobbyCommandKind = iota
	LobbyClientLeft
	LobbyBroadcastRoomList
)

type LobbyCommand struct {
	Kind     LobbyCommandKind
	ClientID uint32
}

type RoomCommandKind int

const (
	RoomPlayerJoin RoomCommandKind = iota
	RoomPlayerLeave
	RoomToggleReady
	RoomChangeMap
	RoomStartGame
)

type RoomCommand struct {
	Kind         RoomCommandKind
	ClientID     uint32
	ClientName   string
	MapID        uint32
	HostClientID uint32
}

type GameCommandKind int

const (
	GamePlayerMove GameCommandKind = iota
	GameGenerateBomb
	GamePlayerDisconnected
	GameTimeSyncPing
)

// PlayerMovePayload is sent by client when moving.
type PlayerMovePayload struct {
	ManKey   types.ManSpriteKey `json:"manKey"`
	NewX     uint32             `json:"newX"`
	NewY     uint32             `json:"newY"`
	Dir      types.ManDirection `json:"dir"`
	IsMoving bool               `json:"isMoving"`
}

// GenerateBombPayload is sent by client when placing a bomb.
type GenerateBombPayload struct {
	ManKey    types.ManSpriteKey `json:"manSpriteKey"`
	X         int32              `json:"x"`
	Y         int32              `json:"y"`
	BombPower uint32             `json:"bombPower"`
}

type GameCommand struct {
	Kind     GameCommandKind
	Move     *PlayerMovePayload
	Bomb     *GenerateBombPayload
	ClientID uint32
	SentAt   int64
}

// ─── Client state ─────────────────────────────────────────────────────────────

type ClientState struct {
	mu     sync.Mutex
	ID     uint32
	Name   string
	RoomID *uint32
	GameID *uint32
}

func (cs *ClientState) GetName() string {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.Name
}

func (cs *ClientState) SetName(name string) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.Name = name
}

func (cs *ClientState) GetRoomID() *uint32 {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.RoomID
}

func (cs *ClientState) SetRoomID(id *uint32) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.RoomID = id
}

func (cs *ClientState) GetGameID() *uint32 {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.GameID
}

func (cs *ClientState) SetGameID(id *uint32) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.GameID = id
}

func (cs *ClientState) GetRoomAndGameID() (*uint32, *uint32) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.RoomID, cs.GameID
}

// ─── AppState ─────────────────────────────────────────────────────────────────

type AppState struct {
	// uint32 -> chan []byte  (one write channel per connected client)
	ClientSenderMap sync.Map
	// uint32 -> *ClientState
	ClientStateMap sync.Map
	// uint32 -> chan RoomCommand
	RoomSenderMap sync.Map
	// uint32 -> types.RoomListItem
	RoomListCache sync.Map
	// uint32 -> chan GameCommand
	GameSenderMap sync.Map

	LobbySender chan LobbyCommand

	nextClientID atomic.Uint32
	nextRoomID   atomic.Uint32
	nextGameID   atomic.Uint32
}

var (
	globalState *AppState
	once        sync.Once
)

func InitGlobalState(lobbySender chan LobbyCommand) {
	once.Do(func() {
		s := &AppState{LobbySender: lobbySender}
		s.nextClientID.Store(1)
		s.nextRoomID.Store(1)
		s.nextGameID.Store(1)
		globalState = s
	})
}

func GetGlobalState() *AppState {
	return globalState
}

func (s *AppState) AllocClientID() uint32 { return s.nextClientID.Add(1) - 1 }
func (s *AppState) AllocRoomID() uint32   { return s.nextRoomID.Add(1) - 1 }
func (s *AppState) AllocGameID() uint32   { return s.nextGameID.Add(1) - 1 }

func (s *AppState) SendToClient(clientID uint32, msg []byte) {
	if v, ok := s.ClientSenderMap.Load(clientID); ok {
		ch := v.(chan []byte)
		select {
		case ch <- msg:
		default:
		}
	}
}

func (s *AppState) SendToRoom(roomID uint32, cmd RoomCommand) {
	if v, ok := s.RoomSenderMap.Load(roomID); ok {
		ch := v.(chan RoomCommand)
		select {
		case ch <- cmd:
		default:
		}
	}
}

func (s *AppState) SendToGame(gameID uint32, cmd GameCommand) {
	if v, ok := s.GameSenderMap.Load(gameID); ok {
		ch := v.(chan GameCommand)
		select {
		case ch <- cmd:
		default:
		}
	}
}

func (s *AppState) GetClientState(clientID uint32) *ClientState {
	if v, ok := s.ClientStateMap.Load(clientID); ok {
		return v.(*ClientState)
	}
	return nil
}
