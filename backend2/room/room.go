package room

import (
	"time"

	"bomberman/backend2/types"
)

type RoomState struct {
	ID       uint32
	Players  []types.PlayerInfo
	OpenedAt time.Time
	MapID    uint32
}

func NewRoomState(id uint32, hostID uint32, hostName string) *RoomState {
	return &RoomState{
		ID: id,
		Players: []types.PlayerInfo{
			{
				ID:           hostID,
				Name:         hostName,
				IsReady:      false,
				IsHost:       true,
				ManSpriteKey: types.Man1,
			},
		},
		OpenedAt: time.Now(),
		MapID:    1,
	}
}

func (r *RoomState) ToListItem() types.RoomListItem {
	return types.RoomListItem{
		ID:               r.ID,
		CurrentPlayerNum: len(r.Players),
		OpenedSecond:     uint64(time.Since(r.OpenedAt).Seconds()),
		MapID:            r.MapID,
	}
}

func (r *RoomState) ToClientData() []types.ClientDataForRoomClient {
	result := make([]types.ClientDataForRoomClient, len(r.Players))
	for i, p := range r.Players {
		result[i] = types.ClientDataForRoomClient{
			ClientID:     p.ID,
			ClientName:   p.Name,
			IsReady:      p.IsReady,
			IsHost:       p.IsHost,
			ManSpriteKey: p.ManSpriteKey,
		}
	}
	return result
}
