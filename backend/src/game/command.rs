use crate::ws::message::{GenerateBombPayload, PlayerMovePayload};

pub enum GameCommand {
    PlayerMove(PlayerMovePayload),
    GenerateBomb(GenerateBombPayload),
    PlayerDisconnected(u32),
    TimeSyncPing { client_id: u32, sent_at: i64 },
}
