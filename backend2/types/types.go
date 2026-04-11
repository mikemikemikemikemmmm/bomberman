package types

// ManSpriteKey identifies which player sprite (man1..man4).
type ManSpriteKey string

const (
	Man1 ManSpriteKey = "man1"
	Man2 ManSpriteKey = "man2"
	Man3 ManSpriteKey = "man3"
	Man4 ManSpriteKey = "man4"
)

func ManSpriteKeyFromIndex(i int) ManSpriteKey {
	switch i {
	case 0:
		return Man1
	case 1:
		return Man2
	case 2:
		return Man3
	default:
		return Man4
	}
}

type ManDirection string

const (
	DirUp    ManDirection = "up"
	DirDown  ManDirection = "down"
	DirLeft  ManDirection = "left"
	DirRight ManDirection = "right"
)

type ItemType string

const (
	ItemFire     ItemType = "fire"
	ItemSpeed    ItemType = "speed"
	ItemMoreBomb ItemType = "moreBomb"
)

type ObjType string

const (
	ObjMan   ObjType = "man"
	ObjBomb  ObjType = "bomb"
	ObjBrick ObjType = "brick"
	ObjWall  ObjType = "wall"
	ObjItem  ObjType = "item"
	ObjFire  ObjType = "fire"
)

// MapIndex is a tile-space coordinate.
type MapIndex struct {
	IndexX uint32
	IndexY uint32
}

// Position is a pixel-space coordinate.
type Position struct {
	PosX uint32
	PosY uint32
}

// PlayerInfo is passed from room to game when a match starts.
type PlayerInfo struct {
	ID           uint32
	Name         string
	IsReady      bool
	IsHost       bool
	ManSpriteKey ManSpriteKey
}

// RoomListItem is the public snapshot of a room sent to lobby clients.
type RoomListItem struct {
	ID               uint32 `json:"id"`
	CurrentPlayerNum int    `json:"currentPlayerNum"`
	OpenedSecond     uint64 `json:"openedSecond"`
	MapID            uint32 `json:"mapId"`
}

// ClientDataForRoomClient is the room-state data sent to each room member.
type ClientDataForRoomClient struct {
	ClientID     uint32       `json:"clientId"`
	ClientName   string       `json:"clientName"`
	IsReady      bool         `json:"isReady"`
	IsHost       bool         `json:"isHost"`
	ManSpriteKey ManSpriteKey `json:"manSpriteKey"`
}
