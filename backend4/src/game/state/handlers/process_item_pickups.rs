use std::sync::atomic::Ordering;

use crate::game::config::TILE_WIDTH;
use crate::game::state::game_state::GameState;
use crate::game::types::ItemType;
use crate::ws::message::{GameStateChangedPayload, ItemEatenPayload};

pub fn process_item_pickups(gs: &mut GameState, changes: &mut GameStateChangedPayload) {
    let mut eaten: Vec<usize> = vec![];

    for (idx, item) in gs.items.iter().enumerate() {
        let itx = item.x / TILE_WIDTH as i32;
        let ity = item.y / TILE_WIDTH as i32;

        for mut player in gs.players.iter_mut() {
            if !player.is_alive.load(Ordering::Relaxed) {
                continue;
            }
            let px = player.x.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
            let py = player.y.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;

            if px == itx && py == ity {
                match &item.item_type {
                    ItemType::Fire => {
                        let v = player.bomb_power.load(Ordering::Relaxed);
                        player.bomb_power.store(v.saturating_add(1), Ordering::Relaxed);
                    }
                    ItemType::Speed => {
                        let v = player.speed.load(Ordering::Relaxed);
                        player.speed.store(v.saturating_add(1), Ordering::Relaxed);
                    }
                    ItemType::MoreBomb => {
                        let v = player.bomb_num.load(Ordering::Relaxed);
                        player.bomb_num.store(v.saturating_add(1), Ordering::Relaxed);
                    }
                }
                changes.items_eaten.push(ItemEatenPayload {
                    man_key: player.man_sprite_key.clone(),
                    x: item.x,
                    y: item.y,
                    item_type: item.item_type.clone(),
                });
                eaten.push(idx);
                break;
            }
        }
    }

    eaten.sort_unstable_by(|a, b| b.cmp(a));
    eaten.dedup();
    for idx in eaten {
        gs.items.remove(idx);
    }
}
