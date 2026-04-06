package game

// EventType identifies a game event produced by the Manager.
type EventType int

const (
	EvtPlayerMove EventType = iota
	EvtGenerateBomb
	EvtBombExplode
	EvtCreateItem
	EvtItemEaten
	EvtPlayerDie
	EvtTimeSyncPong
	EvtGameOver
)

type EvtPlayerMoveData struct {
	ManKey   ManSpriteKey
	X, Y     uint32
	Dir      Direction
	IsMoving bool
}

type EvtGenerateBombData struct {
	ManKey      ManSpriteKey
	X, Y        int
	Power       int
	ExplodeAtMs int64
}

type EvtBombExplodeData struct {
	ManKey       ManSpriteKey
	X, Y, Power  int
}

type EvtCreateItemData struct {
	Item ItemType
	X, Y int
}

type EvtItemEatenData struct {
	ManKey ManSpriteKey
	Item   ItemType
	X, Y   int
}

type EvtPlayerDieData struct {
	ManKey ManSpriteKey
}

type EvtTimeSyncPongData struct {
	SentAt     int64
	ServerTime int64
	From       string
	ClientID   uint32 // who to reply to
}

type EvtGameOverData struct {
	Winner *ManSpriteKey
}

// Event is a tagged union of all possible game events.
type Event struct {
	Type         EventType
	PlayerMove   *EvtPlayerMoveData
	GenerateBomb *EvtGenerateBombData
	BombExplode  *EvtBombExplodeData
	CreateItem   *EvtCreateItemData
	ItemEaten    *EvtItemEatenData
	PlayerDie    *EvtPlayerDieData
	TimeSyncPong *EvtTimeSyncPongData
	GameOver     *EvtGameOverData
}
