use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::game::config::{BOMB_FUSE_SECS, MAP_H, MAP_W};
use crate::game::obj_manager::game_state::{Bomb, GameState};
use crate::ws::message::ClientGenerateBombPayload;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub fn handle_player_create_bomb(gs: &mut GameState, payload: &ClientGenerateBombPayload) {
    let is_create_bomb_accepted: bool = (|| {
        let player = match gs.players.get(&payload.man_key) {
            Some(p) => p,
            None => return false,
        };
        if !player.is_alive.load(Ordering::Relaxed) {
            return false;
        }

        let tile_x = payload.x;
        let tile_y = payload.y;

        if tile_x < 0 || tile_y < 0 || tile_x >= MAP_W as i32 || tile_y >= MAP_H as i32 {
            return false;
        }

        // Reject duplicate bomb on the same tile
        if gs.bombs.iter().any(|b| b.x == tile_x && b.y == tile_y) {
            return false;
        }

        true
    })();
    if !is_create_bomb_accepted {
        return;
    }
    let power = if let Some(player) = gs.players.get(&payload.man_key) {
        player.bomb_power.load(Ordering::Relaxed) as u32
    } else {
        payload.bomb_power
    };
    gs.bombs.push(Bomb {
        x: payload.x,
        y: payload.y,
        power,
        explode_at_ms: now_ms() + BOMB_FUSE_SECS as u64 * 1000,
    });
}
