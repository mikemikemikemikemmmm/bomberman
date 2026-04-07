pub enum LobbyCommand {
    /// A client connected and is waiting in the lobby.
    ClientJoined(u32),
    /// A client left the lobby (joined a room, or disconnected).
    ClientLeft(u32),
    /// Room list changed; broadcast updated list to all lobby clients.
    BroadcastRoomList,
}
