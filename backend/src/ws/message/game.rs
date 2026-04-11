use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::game::types::{ItemType, ManDirection, ManSpriteKey};

// ─── Incoming payloads (client → server) ─────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientMovePayload {
    pub man_key: ManSpriteKey,
    pub new_x: u32,
    pub new_y: u32,
    pub dir: ManDirection,
    pub is_moving: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientGenerateBombPayload {
    pub man_key: ManSpriteKey,
    pub index_x: u32,
    pub index_y: u32
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
pub struct SendBombExplodePayload {
    pub x: i32,
    pub y: i32,
    pub cells: Vec<GridPos>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SendCreateItemPayload {
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendPlayerDiePayload {
    pub man_key: ManSpriteKey,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendTimeSyncPongPayload {
    pub sent_at: i64,
    pub to: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendGameStartedPayload {
    pub game_id: u32,
    pub game_end_time: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendTimeSyncBroadcastPayload {
    pub game_end_time: i64,
    pub sent_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendGameOverPayload {
    pub winner_key: Option<ManSpriteKey>,
}

pub fn make_ws_msg_game_started(payload: SendGameStartedPayload) -> String {
    super::make_ws_msg("gameStarted", &payload)
}

pub fn make_ws_msg_player_move(payload: &ClientMovePayload) -> String {
    super::make_ws_msg("playerMove", payload)
}

pub fn make_ws_msg_generate_bomb(payload: &ClientGenerateBombPayload) -> String {
    super::make_ws_msg("generateBomb", payload)
}

pub fn make_ws_msg_time_sync_pong(payload: SendTimeSyncPongPayload) -> String {
    super::make_ws_msg("timeSyncPong", &payload)
}

pub fn make_ws_msg_bomb_explode(payload: SendBombExplodePayload) -> String {
    super::make_ws_msg("bombExplode", &payload)
}

pub fn make_ws_msg_create_item(payload: SendCreateItemPayload) -> String {
    super::make_ws_msg("createItem", &payload)
}

pub fn make_ws_msg_player_die(payload: SendPlayerDiePayload) -> String {
    super::make_ws_msg("playerDie", &payload)
}

pub fn make_ws_msg_game_over(payload: SendGameOverPayload) -> String {
    super::make_ws_msg("gameOver", &payload)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SendItemEatenPayload {
    pub man_key: ManSpriteKey,
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

pub fn make_ws_msg_item_eaten(payload: &SendItemEatenPayload) -> String {
    super::make_ws_msg("itemEaten", payload)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SendRemoveItemPayload {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SendRemoveFirePayload {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SendGameStateChangedPayload {
    pub player_moves: Vec<ClientMovePayload>,
    pub new_bombs: Vec<ClientGenerateBombPayload>,
    pub bomb_explosions: Vec<SendBombExplodePayload>,
    pub new_items: Vec<SendCreateItemPayload>,
    pub removed_items: Vec<SendRemoveItemPayload>,
    pub removed_fires: Vec<SendRemoveFirePayload>,
    pub player_deaths: Vec<SendPlayerDiePayload>,
    pub items_eaten: Vec<SendItemEatenPayload>,
    pub game_over: Option<SendGameOverPayload>,
}

impl SendGameStateChangedPayload {
    pub fn is_empty(&self) -> bool {
        self.player_moves.is_empty()
            && self.new_bombs.is_empty()
            && self.bomb_explosions.is_empty()
            && self.new_items.is_empty()
            && self.removed_items.is_empty()
            && self.removed_fires.is_empty()
            && self.player_deaths.is_empty()
            && self.items_eaten.is_empty()
            && self.game_over.is_none()
    }
}

pub fn make_ws_msg_game_state_changed(payload: &SendGameStateChangedPayload) -> String {
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
                "x": bomb.index_x,
                "y": bomb.index_y
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

    for rf in &payload.removed_fires {
        events.push(json!({
            "type": "removeFire",
            "payload": { "x": rf.x, "y": rf.y }
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
