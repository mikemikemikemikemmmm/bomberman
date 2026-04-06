package room

// PlayerEntry holds the state of a player inside a room.
type PlayerEntry struct {
	ClientID uint32
	Name     string
	IsReady  bool
}

// State holds the full state of a room.
type State struct {
	RoomID uint32
	Name   string
	MapID  int
	Host   uint32
	// Ordered player list (index 0 = host)
	Players []*PlayerEntry
}

func NewState(roomID uint32, name string, hostID uint32, hostName string) *State {
	return &State{
		RoomID:  roomID,
		Name:    name,
		MapID:   1,
		Host:    hostID,
		Players: []*PlayerEntry{{ClientID: hostID, Name: hostName, IsReady: false}},
	}
}

func (s *State) FindPlayer(clientID uint32) *PlayerEntry {
	for _, p := range s.Players {
		if p.ClientID == clientID {
			return p
		}
	}
	return nil
}

func (s *State) RemovePlayer(clientID uint32) {
	for i, p := range s.Players {
		if p.ClientID == clientID {
			s.Players = append(s.Players[:i], s.Players[i+1:]...)
			// Promote next player to host if needed
			if s.Host == clientID && len(s.Players) > 0 {
				s.Host = s.Players[0].ClientID
			}
			return
		}
	}
}

func (s *State) IsFull() bool {
	return len(s.Players) >= MaxRoomPlayerNum
}

func (s *State) AllReady() bool {
	for _, p := range s.Players {
		if !p.IsReady {
			return false
		}
	}
	return len(s.Players) > 0
}
