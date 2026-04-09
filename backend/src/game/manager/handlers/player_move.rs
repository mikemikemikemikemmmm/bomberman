use std::sync::atomic::Ordering;

use crate::game::config::{MAP_H, MAP_W, TILE_WIDTH};
use crate::game::map::MapMatrixCell;
use crate::game::player::Dir;
use crate::game::obj_manager::game_state::GameState;
use crate::game::types::ManDirection;
use crate::ws::message::PlayerMovePayload;

pub fn handle_player_move(gs: &mut GameState, payload: &PlayerMovePayload) {
    let is_move_accepted: bool = (|| {
        let player = match gs.players.get(&payload.man_key) {
            Some(p) => p,
            None => return false,
        };
        if !player.is_alive.load(Ordering::Relaxed) {
            return false;
        }

        let new_x = payload.new_x as i32;
        let new_y = payload.new_y as i32;
        let tw = TILE_WIDTH as i32;

        let cur_x = player.x.load(Ordering::Relaxed) as i32;
        let cur_y = player.y.load(Ordering::Relaxed) as i32;

        // Check all 4 corners of the player's tile-sized bounding box (mirrors canManMoveByPosition)
        let corners = [
            (new_x,          new_y),
            (new_x + tw - 1, new_y),
            (new_x,          new_y + tw - 1),
            (new_x + tw - 1, new_y + tw - 1),
        ];

        for (cx, cy) in corners {
            let tile_x = cx / tw;
            let tile_y = cy / tw;

            if tile_x < 0 || tile_y < 0 || tile_x >= MAP_W as i32 || tile_y >= MAP_H as i32 {
                return false;
            }

            let cell = gs.map_matrix[tile_y as usize][tile_x as usize];
            if cell == MapMatrixCell::Wall || cell == MapMatrixCell::Brick {
                return false;
            }

            // b.x / b.y are tile indices, not pixel positions
            let bomb_at_tile = gs.bombs.iter().any(|b| b.x == tile_x && b.y == tile_y);
            if bomb_at_tile {
                // Allow passing through if the player's current position already overlaps
                // this bomb tile (mirrors canPassBombPosList logic on the client)
                let bomb_px = tile_x * tw;
                let bomb_py = tile_y * tw;
                let already_overlapping = cur_x < bomb_px + tw
                    && cur_x + tw > bomb_px
                    && cur_y < bomb_py + tw
                    && cur_y + tw > bomb_py;
                if !already_overlapping {
                    return false;
                }
            }
        }

        true
    })();
    if !is_move_accepted {
        return;
    }
    if let Some(mut player) = gs.players.get_mut(&payload.man_key) {
        player.x.store(payload.new_x as u16, Ordering::Relaxed);
        player.y.store(payload.new_y as u16, Ordering::Relaxed);
        player.is_moving.store(payload.is_moving, Ordering::Relaxed);
        player.dir = match payload.dir {
            ManDirection::Up => Dir::Up,
            ManDirection::Down => Dir::Down,
            ManDirection::Left => Dir::Left,
            ManDirection::Right => Dir::Right,
        };
    }
}
