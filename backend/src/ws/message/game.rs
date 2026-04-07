use serde::{Deserialize, Serialize};
use serde_json::json;
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

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RemoveItemPayload {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameStateChangedPayload {
    pub player_moves: Vec<PlayerMovePayload>,
    pub new_bombs: Vec<GenerateBombPayload>,
    pub bomb_explosions: Vec<BombExplodePayload>,
    pub new_items: Vec<CreateItemPayload>,
    pub removed_items: Vec<RemoveItemPayload>,
    pub player_deaths: Vec<PlayerDiePayload>,
    pub items_eaten: Vec<ItemEatenPayload>,
    pub game_over: Option<GameOverPayload>,
}

impl GameStateChangedPayload {
    pub fn is_empty(&self) -> bool {
        self.player_moves.is_empty()
            && self.new_bombs.is_empty()
            && self.bomb_explosions.is_empty()
            && self.new_items.is_empty()
            && self.removed_items.is_empty()
            && self.player_deaths.is_empty()
            && self.items_eaten.is_empty()
            && self.game_over.is_none()
    }
}

pub fn make_ws_msg_game_state_changed(payload: &GameStateChangedPayload) -> String {
    let mut events: Vec<serde_json::Value> = Vec::new();

    for pm in &payload.player_moves {
        events.push(json!({
            "type": "playerMove",
            "payload": {
                "manKey": pm.man_key,
                "newX": pm.new_x,
                "newY": pm.new_y,
                "dir": pm.dir,
                "isMoving": pm.is_moving,
            }
        }));
    }

    for bomb in &payload.new_bombs {
        events.push(json!({
            "type": "generateBomb",
            "payload": {
                "manSpriteKey": bomb.man_key,
                "x": bomb.x,
                "y": bomb.y,
                "bombPower": bomb.bomb_power,
            }
        }));
    }

    for explosion in &payload.bomb_explosions {
        events.push(json!({
            "type": "bombExplode",
            "payload": {
                "x": explosion.x,
                "y": explosion.y,
                "cells": explosion.cells,
            }
        }));
    }

    for item in &payload.new_items {
        events.push(json!({
            "type": "createItem",
            "payload": {
                "x": item.x,
                "y": item.y,
                "itemType": item.item_type,
            }
        }));
    }

    for ri in &payload.removed_items {
        events.push(json!({
            "type": "removeItem",
            "payload": { "x": ri.x, "y": ri.y }
        }));
    }

    for eaten in &payload.items_eaten {
        events.push(json!({
            "type": "removeItem",
            "payload": { "x": eaten.x, "y": eaten.y }
        }));
        events.push(json!({
            "type": "playerGetItem",
            "payload": {
                "x": eaten.x,
                "y": eaten.y,
                "manKey": eaten.man_key,
                "itemType": eaten.item_type,
            }
        }));
    }

    if !payload.player_deaths.is_empty() {
        let deaths: Vec<serde_json::Value> = payload.player_deaths.iter()
            .map(|d| json!({ "manKey": d.man_key }))
            .collect();
        events.push(json!({
            "type": "playerDie",
            "payload": deaths,
        }));
    }

    if payload.game_over.is_some() {
        events.push(json!({ "type": "gameOver" }));
    }

    super::make_ws_msg("gameStateChanged", &events)
}
