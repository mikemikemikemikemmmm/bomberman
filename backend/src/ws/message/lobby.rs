use serde::Serialize;

use crate::state::RoomListItem;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedPayload {
    pub user_id: u32,
}

pub fn make_ws_msg_connected(payload: ConnectedPayload) -> String {
    super::make_ws_msg("connected", &payload)
}

pub fn make_ws_msg_room_list(room_list: &[RoomListItem]) -> String {
    super::make_ws_msg("roomList", room_list)
}
