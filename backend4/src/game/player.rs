use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU8};

use crate::{
    game::{
        config::TILE_WIDTH,
        map::{MapData, MapMatrixCell},
        types::ManSpriteKey,
    },
    room::room::ClientDataForState,
};

pub enum Dir {
    Left,
    Up,
    Right,
    Down,
}

pub struct Player {
    pub name: String,
    pub client_id: u32,
    pub is_alive: AtomicBool,
    pub bomb_num: AtomicU8,
    pub bomb_power: AtomicU8,
    pub speed: AtomicU8,
    pub x: AtomicU16,
    pub y: AtomicU16,
    pub dir: Dir,
    pub is_moving: AtomicBool,
    pub man_sprite_key: ManSpriteKey,
}

impl Player {
    pub fn from_client_at_room(c: &ClientDataForState, map_data: &MapData) -> Option<Self> {
        let target_cell = match c.man_sprite_key {
            ManSpriteKey::Man1 => MapMatrixCell::MAN1,
            ManSpriteKey::Man2 => MapMatrixCell::MAN2,
            ManSpriteKey::Man3 => MapMatrixCell::MAN3,
            ManSpriteKey::Man4 => MapMatrixCell::MAN4,
        };

        let mut spawn_x = TILE_WIDTH;
        let mut spawn_y = TILE_WIDTH;
        'outer: for (row_i, row) in map_data.matrix.iter().enumerate() {
            for (col_i, cell) in row.iter().enumerate() {
                if *cell == target_cell {
                    spawn_x = col_i as u16 * TILE_WIDTH;
                    spawn_y = row_i as u16 * TILE_WIDTH;
                    break 'outer;
                }
            }
        }

        Some(Self {
            name: c.name.clone(),
            client_id: c.id,
            is_alive: AtomicBool::new(true),
            bomb_num: AtomicU8::new(2),
            bomb_power: AtomicU8::new(2),
            speed: AtomicU8::new(1),
            x: AtomicU16::new(spawn_x),
            y: AtomicU16::new(spawn_y),
            dir: Dir::Down,
            is_moving: AtomicBool::new(false),
            man_sprite_key: c.man_sprite_key.clone(),
        })
    }
}
