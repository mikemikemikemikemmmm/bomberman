use dashmap::DashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::game::{
    config,
    map::{MapData, MapMatrix},
    player::Player,
    types::{ItemType, ManSpriteKey, MapIndex},
};
use crate::room::room::ClientDataForState;
use crate::ws::message::ItemEatenPayload;

pub struct Bomb {
    pub x: i32,
    pub y: i32,
    pub power: u32,
    pub explode_at_ms: u64,
}

pub struct Item {
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}
pub struct DestroyingBrick {
    pub end_time: u128,
    pub x: u32,
    pub y: u32,
}
pub struct Fire {
    pub end_time: u128,
    pub x: u32,
    pub y: u32,
}
pub struct GameState {
    pub map_matrix: MapMatrix,
    pub players: DashMap<ManSpriteKey, Player>,
    pub game_end_time: u64,
    pub bombs: Vec<Bomb>,
    pub items: Vec<Item>,
    pub destroying_bricks: Vec<DestroyingBrick>,
    pub fires: Vec<Fire>,
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
            bombs: Vec::new(),
            items: Vec::new(),
            destroying_bricks: Vec::new(),
            fires: Vec::new(),
            game_over: false,
        }
    }
}
