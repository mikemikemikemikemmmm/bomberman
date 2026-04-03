pub enum RoomCommand {
    PlayerJoin { client_id: u32, client_name: String },
    PlayerLeave { client_id: u32 },
    ToggleReady { client_id: u32 },
    ChangeMap { map_id: u32 },
    StartGame { host_client_id: u32 },
}
