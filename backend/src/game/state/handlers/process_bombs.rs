use std::collections::{HashSet, VecDeque};
use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use rand::Rng;

use crate::game::config::{
    BRICK_DESTROY_ANIMATION_SEC, FIRE_ANIMATION_SEC, MAP_H, MAP_W, TILE_WIDTH,
};
use crate::game::map::MapMatrixCell;
use crate::game::state::game_state::{DestroyingBrick, Fire, GameState, Item};
use crate::game::types::ItemType;
use crate::ws::message::{
    BombExplodePayload, CreateItemPayload, GameStateChangedPayload, GridPos, PlayerDiePayload,
    RemoveItemPayload,
};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn now_ms_u128() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

/// Compute cells affected by an explosion at tile position (bx, by) with given power.
/// Mutates the map matrix to mark destroyed bricks as Empty.
/// Returns (fire_cells_in_tiles, destroyed_brick_tile_positions).
fn compute_explosion(
    gs: &mut GameState,
    bx: i32,
    by: i32,
    power: u32,
) -> (Vec<GridPos>, Vec<(i32, i32)>) {
    let mut cells = vec![GridPos { x: bx, y: by }];
    let mut destroyed_bricks = vec![];

    let directions: [(i32, i32); 4] = [(0, -1), (0, 1), (-1, 0), (1, 0)];

    for &(dx, dy) in &directions {
        for dist in 1..=power as i32 {
            let nx = bx + dx * dist;
            let ny = by + dy * dist;

            if nx < 0 || ny < 0 || nx >= MAP_W as i32 || ny >= MAP_H as i32 {
                break;
            }

            let cell = gs.map_matrix[ny as usize][nx as usize];

            if cell == MapMatrixCell::Wall {
                break;
            }

            cells.push(GridPos { x: nx, y: ny });

            if cell == MapMatrixCell::Brick {
                destroyed_bricks.push((nx, ny));
                gs.map_matrix[ny as usize][nx as usize] = MapMatrixCell::Empty;
                break;
            }
        }
    }

    (cells, destroyed_bricks)
}

pub fn process_bombs(gs: &mut GameState, changes: &mut GameStateChangedPayload) {
    let now = now_ms();

    let mut explode_queue: VecDeque<(i32, i32, u32)> = gs
        .bombs
        .iter()
        .filter(|b| b.explode_at_ms <= now)
        .map(|b| (b.x, b.y, b.power))
        .collect();

    gs.bombs.retain(|b| b.explode_at_ms > now);

    if explode_queue.is_empty() {
        return;
    }

    let mut processed: HashSet<(i32, i32)> = HashSet::new();
    let fire_end = now_ms_u128() + FIRE_ANIMATION_SEC as u128 * 1000;
    let brick_end = now_ms_u128() + BRICK_DESTROY_ANIMATION_SEC as u128 * 1000;
    let mut rng = rand::thread_rng();

    while let Some((bx, by, power)) = explode_queue.pop_front() {
        if processed.contains(&(bx, by)) {
            continue;
        }
        processed.insert((bx, by));

        let (cells, destroyed_bricks) = compute_explosion(gs, bx, by, power);

        // Chain-reaction: bombs caught in the blast also explode
        let chain_bombs: Vec<(i32, i32, u32)> = gs
            .bombs
            .iter()
            .filter(|b| cells.iter().any(|c| c.x == b.x && c.y == b.y))
            .map(|b| (b.x, b.y, b.power))
            .collect();

        gs.bombs.retain(|b| !cells.iter().any(|c| c.x == b.x && c.y == b.y));

        for chain in chain_bombs {
            explode_queue.push_back(chain);
        }

        // Place fire on all blast cells
        for cell in &cells {
            gs.fires.push(Fire {
                x: cell.x as u32,
                y: cell.y as u32,
                end_time: fire_end,
            });
        }

        // Remove items in the blast area
        let removed: Vec<(i32, i32)> = gs.items.iter()
            .filter(|item| cells.iter().any(|c| c.x == item.x && c.y == item.y))
            .map(|item| (item.x, item.y))
            .collect();
        for &(rx, ry) in &removed {
            changes.removed_items.push(RemoveItemPayload { x: rx, y: ry });
        }
        gs.items.retain(|item| !cells.iter().any(|c| c.x == item.x && c.y == item.y));

        // Animate destroyed bricks and maybe spawn items
        for &(dbx, dby) in &destroyed_bricks {
            gs.destroying_bricks.push(DestroyingBrick {
                x: dbx as u32,
                y: dby as u32,
                end_time: brick_end,
            });

            if rng.gen_bool(0.3) {
                let item_type = match rng.gen_range(0u8..3) {
                    0 => ItemType::Fire,
                    1 => ItemType::Speed,
                    _ => ItemType::MoreBomb,
                };
                gs.items.push(Item {
                    x: dbx,
                    y: dby,
                    item_type: item_type.clone(),
                });
                changes.new_items.push(CreateItemPayload {
                    x: dbx,
                    y: dby,
                    item_type,
                });
            }
        }

        // Kill players standing on blast cells
        for fire_cell in &cells {
            for mut player in gs.players.iter_mut() {
                if !player.is_alive.load(Ordering::Relaxed) {
                    continue;
                }
                let px = player.x.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                let py = player.y.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                if px == fire_cell.x && py == fire_cell.y {
                    player.is_alive.store(false, Ordering::Relaxed);
                    changes.player_deaths.push(PlayerDiePayload {
                        man_key: player.man_sprite_key.clone(),
                    });
                }
            }
        }

        changes.bomb_explosions.push(BombExplodePayload {
            x: bx,
            y: by,
            cells,
        });
    }
}
