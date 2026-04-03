use serde::{Deserialize, Serialize};
use crate::game::types::{ItemType, ManDirection, ManSpriteKey};

// ─── Incoming payloads (client → server) ─────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlayerMovePayload {
    pub man_key: ManSpriteKey,
    pub new_x: u32,
    pub new_y: u32,
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
pub struct GameStartedPayload {
    pub game_id: u32,
    pub game_end_time: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSyncBroadcastPayload {
    pub game_end_time: i64,
    pub sent_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameOverPayload {
    pub winner_key: Option<ManSpriteKey>,
}

pub fn make_ws_msg_game_started(payload: GameStartedPayload) -> String {
    super::make_ws_msg("gameStarted", &payload)
}

pub fn make_ws_msg_player_move(payload: &PlayerMovePayload) -> String {
    super::make_ws_msg("playerMove", payload)
}

pub fn make_ws_msg_generate_bomb(payload: &GenerateBombPayload) -> String {
    super::make_ws_msg("generateBomb", payload)
}

pub fn make_ws_msg_time_sync_pong(payload: TimeSyncPongPayload) -> String {
    super::make_ws_msg("timeSyncPong", &payload)
}

pub fn make_ws_msg_bomb_explode(payload: BombExplodePayload) -> String {
    super::make_ws_msg("bombExplode", &payload)
}

pub fn make_ws_msg_create_item(payload: CreateItemPayload) -> String {
    super::make_ws_msg("createItem", &payload)
}

pub fn make_ws_msg_player_die(payload: PlayerDiePayload) -> String {
    super::make_ws_msg("playerDie", &payload)
}

pub fn make_ws_msg_game_over(payload: GameOverPayload) -> String {
    super::make_ws_msg("gameOver", &payload)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ItemEatenPayload {
    pub man_key: ManSpriteKey,
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

pub fn make_ws_msg_item_eaten(payload: &ItemEatenPayload) -> String {
    super::make_ws_msg("itemEaten", payload)
}
