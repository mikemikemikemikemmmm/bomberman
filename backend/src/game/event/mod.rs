pub mod command;

use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::ws::Message;

use crate::game::config::{GAME_DURATION_MS, GAME_TICK_MS, TILE_WIDTH};
use crate::game::event::command::GameCommand;
use crate::game::manager::map_manager::MapManager;
use crate::game::manager::obj_manager::ObjManager;
use crate::game::map_data::MapData;
use crate::game::objects::base::BaseObjTrait;
use crate::game::objects::fire::FireObjConfig;
use crate::game::types::ManSpriteKey;
use crate::room::room::ClientDataForState;
use crate::state::AppState;
use crate::ws::message::{
    make_ws_msg_game_state_changed, make_ws_msg_time_sync_pong, BombExplodePayload,
    CreateItemPayload, GameOverPayload, GameStateChangedPayload, GenerateBombPayload,
    GridPos, ItemEatenPayload, PlayerDiePayload, PlayerMovePayload, RemoveFirePayload,
    RemoveItemPayload, TimeSyncPongPayload,
};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub struct EventManager {
    obj_manager: ObjManager,
    pub game_end_time: u64,
    pub game_over: bool,
    /// Maps client_id → ManSpriteKey for disconnect handling.
    client_man_map: HashMap<u32, ManSpriteKey>,
    player_ids: Vec<u32>,
}

impl EventManager {
    pub fn new(map_data: &MapData, players: &[ClientDataForState]) -> Self {
        let man_keys: Vec<ManSpriteKey> =
            players.iter().map(|p| p.man_sprite_key.clone()).collect();
        let (map_manager, man_objs) = MapManager::new(map_data, &man_keys);
        let obj_manager = ObjManager::new(map_manager.map, man_objs);

        let game_end_time = now_ms() + GAME_DURATION_MS as u64;
        let client_man_map = players.iter().map(|p| (p.id, p.man_sprite_key.clone())).collect();
        let player_ids = players.iter().map(|p| p.id).collect();

        Self {
            obj_manager,
            game_end_time,
            game_over: false,
            client_man_map,
            player_ids,
        }
    }

    /// Process all queued commands, run one game tick, then broadcast any changes.
    pub fn consume_commands(
        &mut self,
        commands: &mut VecDeque<GameCommand>,
        state: &AppState,
    ) {
        let mut changes = GameStateChangedPayload::default();

        // ── 1. Handle incoming commands ───────────────────────────────────────
        while let Some(cmd) = commands.pop_front() {
            match cmd {
                GameCommand::PlayerMove(p) => self.handle_receive_player_move(p, &mut changes),
                GameCommand::GenerateBomb(p) => self.handle_receive_generate_bomb(p, &mut changes),
                GameCommand::PlayerDisconnected(cid) => {
                    self.handle_receive_player_disconnected(cid, &mut changes)
                }
                GameCommand::TimeSyncPing { client_id, sent_at } => {
                    self.handle_time_sync_ping(client_id, sent_at, state)
                }
            }
        }

        // ── 2. Game tick ──────────────────────────────────────────────────────
        let pass_ms = GAME_TICK_MS as u32;

        let removed_fires = self.obj_manager.tick_fires(pass_ms);
        for (cx, cy) in removed_fires {
            changes.removed_fires.push(RemoveFirePayload { x: cx as i32, y: cy as i32 });
        }
        self.obj_manager.tick_ruining_bricks(pass_ms);

        // Compute explosion data and convert to broadcast payloads.
        let explode_data = self.obj_manager.handle_get_explode_bomb_data(pass_ms);

        for fc in &explode_data.show_fire_configs {
            changes.bomb_explosions.push(BombExplodePayload {
                x: fc.center_x as i32,
                y: fc.center_y as i32,
                cells: fire_config_to_grid_pos(fc),
            });
        }

        for pos in &explode_data.destroy_item_positions {
            changes
                .removed_items
                .push(RemoveItemPayload { x: pos.index_x as i32, y: pos.index_y as i32 });
        }

        let spawned = self.obj_manager.handle_render_explode_by_data(explode_data);
        for (index, item_type) in spawned {
            changes.new_items.push(CreateItemPayload {
                x: index.index_x as i32,
                y: index.index_y as i32,
                item_type,
            });
        }

        // ── 3. Fire deaths ────────────────────────────────────────────────────
        let fire_cells = self.obj_manager.get_fire_cells();
        for player in &mut self.obj_manager.players {
            if !player.is_alive {
                continue;
            }
            let pos = player.base.get_position();
            let tx = pos.pos_x / TILE_WIDTH;
            let ty = pos.pos_y / TILE_WIDTH;
            if fire_cells.contains(&(tx, ty)) {
                player.is_alive = false;
                changes
                    .player_deaths
                    .push(PlayerDiePayload { man_key: player.man_sprite_key.clone() });
            }
        }

        // ── 4. Item pickups ───────────────────────────────────────────────────
        for (man_key, index, item_type) in self.obj_manager.handle_item_pickups() {
            changes.items_eaten.push(ItemEatenPayload {
                man_key,
                x: index.index_x as i32,
                y: index.index_y as i32,
                item_type,
            });
        }

        // ── 5. Game-over check ────────────────────────────────────────────────
        self.check_game_over(&mut changes);

        // ── 6. Broadcast ──────────────────────────────────────────────────────
        if !changes.is_empty() {
            let msg = Message::Text(make_ws_msg_game_state_changed(&changes).into());
            self.broadcast(msg, state);
        }
    }

    // ── Command handlers ──────────────────────────────────────────────────────

    fn handle_receive_player_move(&mut self, payload: PlayerMovePayload, changes: &mut GameStateChangedPayload) {
        let is_alive = self
            .obj_manager
            .players
            .iter()
            .find(|p| p.man_sprite_key == payload.man_key)
            .map(|p| p.is_alive)
            .unwrap_or(false);
        if !is_alive {
            return;
        }

        if let Some(mv) =
            self.obj_manager.handle_player_position_change(&payload.man_key, &payload.dir)
        {
            changes.player_moves.push(PlayerMovePayload {
                man_key: mv.man_key,
                new_x: mv.new_x,
                new_y: mv.new_y,
                dir: mv.dir,
                is_moving: mv.is_moving,
            });
        }
    }

    fn handle_receive_generate_bomb(
        &mut self,
        payload: GenerateBombPayload,
        changes: &mut GameStateChangedPayload,
    ) {
        let is_alive = self
            .obj_manager
            .players
            .iter()
            .find(|p| p.man_sprite_key == payload.man_key)
            .map(|p| p.is_alive)
            .unwrap_or(false);
        if !is_alive {
            return;
        }

        if let Some(placed) = self.obj_manager.handle_self_place_bomb(&payload.man_key) {
            changes.new_bombs.push(GenerateBombPayload {
                man_key: placed.man_key,
                x: placed.x as i32,
                y: placed.y as i32,
                bomb_power: placed.bomb_power,
            });
        }
    }

    fn handle_receive_player_disconnected(
        &mut self,
        client_id: u32,
        changes: &mut GameStateChangedPayload,
    ) {
        if let Some(man_key) = self.client_man_map.get(&client_id).cloned() {
            self.obj_manager.handle_player_die(&man_key);
            changes.player_deaths.push(PlayerDiePayload { man_key });
        }
    }

    fn handle_time_sync_ping(&self, client_id: u32, sent_at: i64, state: &AppState) {
        let to = self
            .client_man_map
            .get(&client_id)
            .map(|k| format!("{:?}", k))
            .unwrap_or_default();
        let msg = Message::Text(
            make_ws_msg_time_sync_pong(TimeSyncPongPayload { sent_at, to }).into(),
        );
        state.send_to_client(client_id, msg);
    }

    // ── Game-over logic ───────────────────────────────────────────────────────

    fn check_game_over(&mut self, changes: &mut GameStateChangedPayload) {
        if self.game_over {
            return;
        }

        let alive: Vec<ManSpriteKey> = self
            .obj_manager
            .players
            .iter()
            .filter(|p| p.is_alive)
            .map(|p| p.man_sprite_key.clone())
            .collect();

        let winner = if now_ms() >= self.game_end_time {
            self.game_over = true;
            if alive.len() == 1 { alive.into_iter().next() } else { None }
        } else if alive.len() <= 1 {
            self.game_over = true;
            alive.into_iter().next()
        } else {
            return;
        };

        changes.game_over = Some(GameOverPayload { winner_key: winner });
    }

    // ── Broadcast helpers ─────────────────────────────────────────────────────

    fn broadcast(&self, msg: Message, state: &AppState) {
        for &id in &self.player_ids {
            state.send_to_client(id, msg.clone());
        }
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

fn fire_config_to_grid_pos(fc: &FireObjConfig) -> Vec<GridPos> {
    let mut cells = vec![GridPos { x: fc.center_x as i32, y: fc.center_y as i32 }];
    for i in 1..=fc.vertical_start {
        cells.push(GridPos { x: fc.center_x as i32, y: fc.center_y as i32 - i as i32 });
    }
    for i in 1..=fc.vertical_end {
        cells.push(GridPos { x: fc.center_x as i32, y: fc.center_y as i32 + i as i32 });
    }
    for i in 1..=fc.horizontal_start {
        cells.push(GridPos { x: fc.center_x as i32 - i as i32, y: fc.center_y as i32 });
    }
    for i in 1..=fc.horizontal_end {
        cells.push(GridPos { x: fc.center_x as i32 + i as i32, y: fc.center_y as i32 });
    }
    cells
}
