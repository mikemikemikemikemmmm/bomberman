package room

// CommandType identifies room commands.
type CommandType int

const (
	CmdPlayerJoin CommandType = iota
	CmdPlayerLeave
	CmdToggleReady
	CmdChangeMap
	CmdStartGame
)

// Command is a message sent to a room actor.
type Command struct {
	Type        CommandType
	ClientID    uint32
	ClientName  string
	MapID       int
	HostClientID uint32
}
