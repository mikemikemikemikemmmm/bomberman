package lobby

// CommandType identifies lobby commands.
type CommandType int

const (
	CmdClientJoined CommandType = iota
	CmdClientLeft
	CmdBroadcastRoomList
)

// Command is a message sent to the lobby actor.
type Command struct {
	Type     CommandType
	ClientID uint32
}
