use crate::ws::message::{ClientGenerateBombPayload, ClientMovePayload};
#[derive(Debug)]
pub enum GameCommand {
    PlayerMove(ClientMovePayload),
    GenerateBomb(ClientGenerateBombPayload),
    PlayerDisconnected(u32),
    TimeSyncPing { client_id: u32, sent_at: i64 },
}
