use serde::Serialize;

use crate::room::room::ClientDataForRoomClient;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RoomStatePayload<'a> {
    room_id: u32,
    map_id: u32,
    players: &'a [ClientDataForRoomClient],
}

pub fn make_ws_msg_room_state(room_id: u32, map_id: u32, data: &[ClientDataForRoomClient]) -> String {
    super::make_ws_msg("roomState", &RoomStatePayload { room_id, map_id, players: data })
}

pub fn make_ws_msg_error(msg: &str) -> String {
    super::make_ws_msg("error", &serde_json::json!({ "msg": msg }))
}
