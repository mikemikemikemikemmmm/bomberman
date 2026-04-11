pub mod game;
pub mod lobby;
pub mod room;

pub use game::*;
pub use lobby::*;
pub use room::*;

use serde::{Deserialize, Serialize};

/// Every message on the wire: { "type": "...", "payload": ... }
#[derive(Debug, Deserialize)]
pub struct WsRawMessage {
    pub  r#type: String,
    pub payload: serde_json::Value,
}

pub fn make_ws_msg<T: Serialize + ?Sized>(msg_type: &str, payload: &T) -> String {
    serde_json::json!({ "type": msg_type, "payload": payload }).to_string()
}
