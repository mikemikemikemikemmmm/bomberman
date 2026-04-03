use std::collections::VecDeque;
use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::ws::Message;
use rand::Rng;
use tracing::info;

use crate::game::command::GameCommand;
use crate::game::config::{BOMB_FUSE_SECS, MAP_H, MAP_W, TILE_WIDTH};
use crate::game::game::{ActiveBomb, ActiveItem, GameState};
use crate::game::map::{MapMatrixCell};
use crate::game::player::Dir;
use crate::game::types::{ItemType, ManDirection, ManSpriteKey};
use crate::state::AppState;
use crate::ws::message::{
    make_ws_msg_bomb_explode, make_ws_msg_create_item, make_ws_msg_game_over,
    make_ws_msg_generate_bomb, make_ws_msg_item_eaten, make_ws_msg_player_die,
    make_ws_msg_player_move, make_ws_msg_time_sync_pong, BombExplodePayload, CreateItemPayload,
    GameOverPayload, GridPos, ItemEatenPayload, PlayerDiePayload, TimeSyncPongPayload,
};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn broadcast_all(msg: Message, player_ids: &[u32], state: &'static AppState) {
    for &id in player_ids {
        state.send_to_client(id, msg.clone());
    }
}

pub struct GameStateManager {}

impl GameStateManager {
    /// Broadcast itemEaten events queued by handle_player_eat_items to all players.
    pub fn broadcast_changes_to_players(
        game_state: &mut GameState,
        player_ids: &[u32],
        state: &'static AppState,
    ) {
        for eat in game_state.pending_item_eats.drain(..) {
            let msg = Message::Text(make_ws_msg_item_eaten(&eat).into());
            broadcast_all(msg, player_ids, state);
        }
    }
    pub fn handle_all_players_move(game_state: &mut GameState) {
        const BASE_SPEED_PX: i32 = 4; // pixels advanced per speed unit per tick

        for mut entry in game_state.players.iter_mut() {
            let player = entry.value_mut();

            if !player.is_alive.load(Ordering::Relaxed) {
                continue;
            }
            if !player.is_moving.load(Ordering::Relaxed) {
                continue;
            }

            let step = player.speed.load(Ordering::Relaxed) as i32 * BASE_SPEED_PX;
            let cur_x = player.x.load(Ordering::Relaxed) as i32;
            let cur_y = player.y.load(Ordering::Relaxed) as i32;

            let (new_x, new_y) = match player.dir {
                Dir::Left  => (cur_x - step, cur_y),
                Dir::Right => (cur_x + step, cur_y),
                Dir::Up    => (cur_x, cur_y - step),
                Dir::Down  => (cur_x, cur_y + step),
            };

            let max_x = (MAP_W as i32 - 1) * TILE_WIDTH as i32;
            let max_y = (MAP_H as i32 - 1) * TILE_WIDTH as i32;
            let new_x = new_x.clamp(0, max_x);
            let new_y = new_y.clamp(0, max_y);

            let tile_x = (new_x / TILE_WIDTH as i32) as usize;
            let tile_y = (new_y / TILE_WIDTH as i32) as usize;

            let cell = game_state.map_matrix[tile_y][tile_x];
            if cell != MapMatrixCell::Wall && cell != MapMatrixCell::Brick {
                player.x.store(new_x as u16, Ordering::Relaxed);
                player.y.store(new_y as u16, Ordering::Relaxed);
            }
        }
    }
    pub fn handle_player_eat_items(game_state: &mut GameState) {
        struct EatEvent {
            item_idx: usize,
            man_key: ManSpriteKey,
            item_type: ItemType,
            x: i32,
            y: i32,
        }
        let mut events: Vec<EatEvent> = Vec::new();

        for (idx, item) in game_state.active_items.iter().enumerate() {
            let it_x = item.x / TILE_WIDTH as i32;
            let it_y = item.y / TILE_WIDTH as i32;
            for entry in game_state.players.iter() {
                let player = entry.value();
                if !player.is_alive.load(Ordering::Relaxed) {
                    continue;
                }
                let pt_x = player.x.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                let pt_y = player.y.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                if pt_x == it_x && pt_y == it_y {
                    events.push(EatEvent {
                        item_idx: idx,
                        man_key: entry.key().clone(),
                        item_type: item.item_type.clone(),
                        x: item.x,
                        y: item.y,
                    });
                    break;
                }
            }
        }

        for event in &events {
            if let Some(player) = game_state.players.get(&event.man_key) {
                match event.item_type {
                    ItemType::Fire => {
                        player.bomb_power.fetch_add(1, Ordering::Relaxed);
                    }
                    ItemType::Speed => {
                        player.speed.fetch_add(1, Ordering::Relaxed);
                    }
                    ItemType::MoreBomb => {
                        player.bomb_num.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
            game_state.pending_item_eats.push(ItemEatenPayload {
                man_key: event.man_key.clone(),
                x: event.x,
                y: event.y,
                item_type: event.item_type.clone(),
            });
        }

        // Remove consumed items (descending order preserves indices)
        let mut indices: Vec<usize> = events.iter().map(|e| e.item_idx).collect();
        indices.sort_unstable();
        indices.dedup();
        for idx in indices.into_iter().rev() {
            game_state.active_items.swap_remove(idx);
        }
    }

    /// Detonate any bombs whose fuse has expired, compute blast cells, destroy bricks,
    /// kill players in the blast, and optionally spawn items from destroyed bricks.
    pub fn handle_bomb_explode(
        game_state: &mut GameState,
        player_ids: &[u32],
        state: &'static AppState,
    ) {
        let now = now_ms();
        let mut new_items: Vec<ActiveItem> = Vec::new();
        let mut newly_dead: Vec<ManSpriteKey> = Vec::new();

        let mut i = 0;
        while i < game_state.active_bombs.len() {
            if game_state.active_bombs[i].explode_at_ms > now {
                i += 1;
                continue;
            }
            let bomb = game_state.active_bombs.swap_remove(i);
            // i is NOT incremented — swap_remove puts the last element at index i

            let bx = bomb.x / TILE_WIDTH as i32;
            let by = bomb.y / TILE_WIDTH as i32;
            let power = bomb.power as i32;

            // Center cell is always part of the explosion
            let mut cells: Vec<GridPos> = vec![GridPos { x: bomb.x, y: bomb.y }];

            let dirs: [(i32, i32); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];
            for (dx, dy) in dirs {
                for step in 1..=power {
                    let tx = bx + dx * step;
                    let ty = by + dy * step;
                    if tx < 0 || ty < 0 || tx >= MAP_W as i32 || ty >= MAP_H as i32 {
                        break;
                    }
                    let cell = &mut game_state.map_matrix[ty as usize][tx as usize];
                    match *cell {
                        MapMatrixCell::Wall => break,
                        MapMatrixCell::Brick => {
                            *cell = MapMatrixCell::Empty;
                            let px = tx * TILE_WIDTH as i32;
                            let py = ty * TILE_WIDTH as i32;
                            cells.push(GridPos { x: px, y: py });

                            let mut rng = rand::thread_rng();
                            if rng.gen_bool(0.3) {
                                let item_type = match rng.gen_range(0..3u8) {
                                    0 => ItemType::Fire,
                                    1 => ItemType::Speed,
                                    _ => ItemType::MoreBomb,
                                };
                                new_items.push(ActiveItem { x: px, y: py, item_type });
                            }
                            break; // brick stops the blast
                        }
                        _ => {
                            // Empty, MAN spawn points — passthrough
                            cells.push(GridPos {
                                x: tx * TILE_WIDTH as i32,
                                y: ty * TILE_WIDTH as i32,
                            });
                        }
                    }
                }
            }

            // Collect blast tile coords for player hit-check
            let blast_tiles: Vec<(i32, i32)> = cells
                .iter()
                .map(|c| (c.x / TILE_WIDTH as i32, c.y / TILE_WIDTH as i32))
                .collect();

            for entry in game_state.players.iter() {
                let player = entry.value();
                if !player.is_alive.load(Ordering::Relaxed) {
                    continue;
                }
                let pt_x = player.x.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                let pt_y = player.y.load(Ordering::Relaxed) as i32 / TILE_WIDTH as i32;
                if blast_tiles.iter().any(|&(bx, by)| bx == pt_x && by == pt_y) {
                    player.is_alive.store(false, Ordering::Relaxed);
                    newly_dead.push(entry.key().clone());
                }
            }

            // Broadcast explosion
            let explode_msg = Message::Text(
                make_ws_msg_bomb_explode(BombExplodePayload {
                    x: bomb.x,
                    y: bomb.y,
                    cells,
                })
                .into(),
            );
            broadcast_all(explode_msg, player_ids, state);

            // Broadcast spawned items
            for item in &new_items {
                let item_msg = Message::Text(
                    make_ws_msg_create_item(CreateItemPayload {
                        x: item.x,
                        y: item.y,
                        item_type: item.item_type.clone(),
                    })
                    .into(),
                );
                broadcast_all(item_msg, player_ids, state);
            }
        }

        game_state.pending_deaths.extend(newly_dead);
        game_state.active_items.extend(new_items);
    }

    /// Broadcast death notifications for any players marked dead this tick.
    pub fn handle_player_die(
        game_state: &mut GameState,
        player_ids: &[u32],
        state: &'static AppState,
    ) {
        for man_key in game_state.pending_deaths.drain(..) {
            info!("player {:?} died", man_key);
            let msg = Message::Text(
                make_ws_msg_player_die(PlayerDiePayload {
                    man_key: man_key.clone(),
                })
                .into(),
            );
            broadcast_all(msg, player_ids, state);
        }
    }

    /// End the game when ≤1 player is alive or the timer has expired.
    pub fn handle_game_over(
        game_state: &mut GameState,
        player_ids: &[u32],
        state: &'static AppState,
    ) {
        if game_state.game_over {
            return;
        }
        let now = now_ms();
        let time_up = now >= game_state.game_end_time;

        let alive: Vec<ManSpriteKey> = game_state
            .players
            .iter()
            .filter(|e| e.value().is_alive.load(Ordering::Relaxed))
            .map(|e| e.key().clone())
            .collect();

        if !time_up && alive.len() > 1 {
            return;
        }

        game_state.game_over = true;
        let winner = if alive.len() == 1 { Some(alive[0].clone()) } else { None };
        info!("game over, winner: {:?}", winner);

        let msg = Message::Text(
            make_ws_msg_game_over(GameOverPayload { winner_key: winner }).into(),
        );
        broadcast_all(msg, player_ids, state);
    }

    /// Drain all queued commands and process them.
    pub fn consume_game_commands(
        command_list: &mut VecDeque<GameCommand>,
        game_id: u32,
        player_ids: &[u32],
        state: &'static AppState,
        game_state: &mut GameState,
    ) {
        while let Some(cmd) = command_list.pop_front() {
            match cmd {
                GameCommand::PlayerMove(payload) => {
                    // Keep server-side position in sync for hit detection
                    if let Some(mut entry) = game_state.players.get_mut(&payload.man_key) {
                        let player = entry.value_mut();
                        player.x.store(payload.new_x as u16, Ordering::Relaxed);
                        player.y.store(payload.new_y as u16, Ordering::Relaxed);
                        player.is_moving.store(payload.is_moving, Ordering::Relaxed);
                        player.dir = match payload.dir {
                            ManDirection::Left  => Dir::Left,
                            ManDirection::Right => Dir::Right,
                            ManDirection::Up    => Dir::Up,
                            ManDirection::Down  => Dir::Down,
                        };
                    }
                    let msg = Message::Text(make_ws_msg_player_move(&payload).into());
                    for &id in player_ids {
                        if id == payload.user_id {
                            continue; // don't echo back to sender
                        }
                        state.send_to_client(id, msg.clone());
                    }
                }
                GameCommand::GenerateBomb(payload) => {
                    let explode_at_ms = now_ms() + BOMB_FUSE_SECS as u64 * 1000;
                    game_state.active_bombs.push(ActiveBomb {
                        man_key: payload.man_key.clone(),
                        x: payload.x,
                        y: payload.y,
                        power: payload.bomb_power,
                        explode_at_ms,
                    });
                    let msg = Message::Text(make_ws_msg_generate_bomb(&payload).into());
                    for &id in player_ids {
                        state.send_to_client(id, msg.clone());
                    }
                }
                GameCommand::PlayerDisconnected(client_id) => {
                    info!("player {} disconnected from game {}", client_id, game_id);
                    let mut dead_key: Option<ManSpriteKey> = None;
                    for entry in game_state.players.iter() {
                        if entry.value().client_id == client_id {
                            entry.value().is_alive.store(false, Ordering::Relaxed);
                            dead_key = Some(entry.key().clone());
                            break;
                        }
                    }
                    if let Some(key) = dead_key {
                        game_state.pending_deaths.push(key);
                    }
                }
                GameCommand::TimeSyncPing { client_id, sent_at } => {
                    state.send_to_client(
                        client_id,
                        Message::Text(
                            make_ws_msg_time_sync_pong(TimeSyncPongPayload {
                                sent_at,
                                to: client_id.to_string(),
                            })
                            .into(),
                        ),
                    );
                }
            }
        }
    }
}
