use dashmap::DashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::game::{config, map::{MapData, MapMatrix}, player::Player, types::{ItemType, ManSpriteKey}};
use crate::room::room::ClientDataForState;
use crate::ws::message::ItemEatenPayload;

pub struct ActiveBomb {
    pub man_key: ManSpriteKey,
    pub x: i32,
    pub y: i32,
    pub power: u32,
    pub explode_at_ms: u64,
}

pub struct ActiveItem {
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

pub struct GameState {
    pub map_matrix: MapMatrix,
    pub players: DashMap<ManSpriteKey, Player>,
    pub game_end_time: u64,
    pub active_bombs: Vec<ActiveBomb>,
    pub active_items: Vec<ActiveItem>,
    pub pending_deaths: Vec<ManSpriteKey>,
    pub pending_item_eats: Vec<ItemEatenPayload>,
    pub game_over: bool,
}

impl GameState {
    pub fn new(map_data: &MapData, players: &[ClientDataForState]) -> Self {
        let player_map: DashMap<ManSpriteKey, Player> = DashMap::new();
        for c in players {
            if let Some(player) = Player::from_client_at_room(c, &map_data) {
                player_map.insert(c.man_sprite_key.clone(), player);
            }
        }
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let game_end_time = now_ms + config::GAME_DURATION_MS as u64;

        Self {
            map_matrix: map_data.matrix,
            players: player_map,
            game_end_time,
            active_bombs: Vec::new(),
            active_items: Vec::new(),
            pending_deaths: Vec::new(),
            pending_item_eats: Vec::new(),
            game_over: false,
        }
    }
}
