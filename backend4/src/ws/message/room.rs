use crate::room::room::ClientDataForRoomClient;

pub fn make_ws_msg_room_state(data: &[ClientDataForRoomClient]) -> String {
    super::make_ws_msg("roomState", data)
}

pub fn make_ws_msg_error(msg: &str) -> String {
    super::make_ws_msg("error", &serde_json::json!({ "msg": msg }))
}
