use serde::{Deserialize, Serialize};

// ─── Shared enums ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ManSpriteKey {
    #[serde(rename = "man1")]
    Man1,
    #[serde(rename = "man2")]
    Man2,
    #[serde(rename = "man3")]
    Man3,
    #[serde(rename = "man4")]
    Man4,
}

impl ManSpriteKey {
    pub fn from_index(i: usize) -> Self {
        match i {
            0 => Self::Man1,
            1 => Self::Man2,
            2 => Self::Man3,
            _ => Self::Man4,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ManDirection {
    #[serde(rename = "up")]
    Up,
    #[serde(rename = "down")]
    Down,
    #[serde(rename = "left")]
    Left,
    #[serde(rename = "right")]
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ItemType {
    #[serde(rename = "fire")]
    Fire,
    #[serde(rename = "speed")]
    Speed,
    #[serde(rename = "moreBomb")]
    MoreBomb,
}

// ─── Wire format ─────────────────────────────────────────────────────────────

/// Every message on the wire: { "type": "...", "payload": ... }
#[derive(Debug, Deserialize)]
pub struct RawMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(default)]
    pub payload: serde_json::Value,
}

pub fn make_msg<T: Serialize>(msg_type: &str, payload: &T) -> String {
    serde_json::json!({ "type": msg_type, "payload": payload }).to_string()
}

pub fn make_msg_null(msg_type: &str) -> String {
    serde_json::json!({ "type": msg_type, "payload": null }).to_string()
}

// ─── Incoming payloads (client → server) ─────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMovePayload {
    pub man_key: ManSpriteKey,
    pub new_x: f32,
    pub new_y: f32,
    pub dir: ManDirection,
    pub is_moving: bool,
    pub user_id: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GenerateBombPayload {
    pub man_key: ManSpriteKey,
    pub x: i32,
    pub y: i32,
    pub bomb_power: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSyncPingPayload {
    pub sent_at: i64,
    pub from: String,
}

// ─── Outgoing payloads (server → client) ─────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedPayload {
    pub user_id: u32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GridPos {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BombExplodePayload {
    pub x: i32,
    pub y: i32,
    pub cells: Vec<GridPos>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateItemPayload {
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemEatenPayload {
    pub man_key: ManSpriteKey,
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDiePayload {
    pub man_key: ManSpriteKey,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSyncPongPayload {
    pub sent_at: i64,
    pub to: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSyncBroadcastPayload {
    pub game_end_time: i64,
    pub sent_at: i64,
}
