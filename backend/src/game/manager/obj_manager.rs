use std::collections::HashSet;

use rand::Rng;

use crate::game::config::{BRICK_RUIN_COUNTDOWN_MS, TILE_WIDTH};
use crate::game::manager::map_manager::MapManager;
use crate::game::objects::base::BaseObjTrait;
use crate::game::objects::bomb::BombObj;
use crate::game::objects::brick::BrickObj;
use crate::game::objects::fire::{FireObj, FireObjConfig};
use crate::game::objects::item::ItemObj;
use crate::game::objects::man::ManObj;
use crate::game::types::{ItemType, ManDirection, ManSpriteKey, MapIndex, Position};
use crate::game::utils::tran_index_to_pos;
use crate::ws::message::ClientGenerateBombPayload;

// ========================
// Map tile types
// ========================

pub enum MapTile {
    Wall,
    Bomb,
    Brick(BrickObj),
    Item(ItemObj),
}

impl MapTile {
    pub fn tile_type(&self) -> MapTileType {
        match self {
            MapTile::Wall => MapTileType::Wall,
            MapTile::Bomb => MapTileType::Bomb,
            MapTile::Brick(_) => MapTileType::Brick,
            MapTile::Item(_) => MapTileType::Item,
        }
    }
}

#[derive(PartialEq, Eq)]
pub enum MapTileType {
    Empty,
    Wall,
    Bomb,
    Brick,
    Item,
}

pub type MapMatrix = Vec<Vec<Option<MapTile>>>;

// ========================
// ExplodeData
// ========================

pub struct ExplodeData {
    pub explode_bomb_positions: Vec<MapIndex>,
    pub ruin_brick_positions: Vec<MapIndex>,
    pub destroy_item_positions: Vec<MapIndex>,
    pub show_fire_configs: Vec<FireObjConfig>,
}

// ========================
// Payload structs
// ========================

pub struct PlaceBombPayload {
    pub man_key: ManSpriteKey,
    pub x: u32,
    pub y: u32,
    pub bomb_power: u32,
}

pub struct MovePayload {
    pub man_key: ManSpriteKey,
    pub new_x: u32,
    pub new_y: u32,
    pub dir: ManDirection,
    pub is_moving: bool,
}

// ========================
// ObjManager
// ========================

pub struct ObjManager {
    pub players: Vec<ManObj>,
    pub map_manager: MapManager,
    pub fires: Vec<FireObj>,
    /// Bricks in destroy animation: (tile index, remaining_ms).
    pub ruining_bricks: Vec<(MapIndex, u32)>,
    pub bombs: Vec<BombObj>
}

impl ObjManager {
    pub fn new(map_manager: MapManager, players: Vec<ManObj>) -> Self {
        Self {
            players,
            map_manager,
            fires: vec![],
            ruining_bricks: vec![],
            bombs: vec![],
        }
    }

    // ========================
    // Countdown / tick
    // ========================

    pub fn tick_fires(&mut self, pass_ms: u32) -> Vec<(usize, usize)> {
        let mut removed = vec![];
        self.fires.retain_mut(|fire| {
            fire.remaining_ms = fire.remaining_ms.saturating_sub(pass_ms);
            if fire.remaining_ms == 0 {
                removed.push((fire.config.center_x, fire.config.center_y));
                false
            } else {
                true
            }
        });
        removed
    }

    pub fn tick_ruining_bricks(&mut self, pass_ms: u32) {
        self.ruining_bricks.retain_mut(|(_, remaining)| {
            *remaining = remaining.saturating_sub(pass_ms);
            *remaining > 0
        });
    }

    /// All map tiles (tile coords) currently covered by active fires.
    pub fn get_fire_cells(&self) -> Vec<(u32, u32)> {
        let mut cells: Vec<(u32, u32)> = vec![];
        for fire in &self.fires {
            let cx = fire.config.center_x as u32;
            let cy = fire.config.center_y as u32;
            cells.push((cx, cy));
            for i in 1..=fire.config.vertical_start as u32 {
                cells.push((cx, cy.saturating_sub(i)));
            }
            for i in 1..=fire.config.vertical_end as u32 {
                cells.push((cx, cy + i));
            }
            for i in 1..=fire.config.horizontal_start as u32 {
                cells.push((cx.saturating_sub(i), cy));
            }
            for i in 1..=fire.config.horizontal_end as u32 {
                cells.push((cx + i, cy));
            }
        }
        cells
    }

    // ========================
    // Explosion logic
    // ========================

    /// Tick bomb timers, collect expired bombs, compute chain explosions and fire spread.
    pub fn handle_get_explode_bomb_data(&mut self, pass_ms: u32) -> ExplodeData {
        let mut result = ExplodeData {
            explode_bomb_positions: vec![],
            ruin_brick_positions: vec![],
            destroy_item_positions: vec![],
            show_fire_configs: vec![],
        };

        // Tick bomb timers; collect expired positions
        for bomb in self.bombs.iter_mut() {
            bomb.remaining_ms = bomb.remaining_ms.saturating_sub(pass_ms);
            if bomb.remaining_ms == 0 {
                result.explode_bomb_positions.push(bomb.base.get_map_index());
            }
        }

        // Chain-reaction explosion processing
        let mut processed: HashSet<(u32, u32)> = HashSet::new();
        let mut to_process: Vec<MapIndex> = result.explode_bomb_positions.clone();

        while let Some(pos) = to_process.first().cloned() {
            to_process.remove(0);

            let key = (pos.index_x, pos.index_y);
            if processed.contains(&key) {
                continue;
            }
            processed.insert(key);

            let power = match self.bombs.iter().find(|b| {
                let idx = b.base.get_map_index();
                idx.index_x == pos.index_x && idx.index_y == pos.index_y
            }) {
                Some(b) => b.power,
                None => continue,
            };

            // Four directions: up, down, left, right
            let dirs: [(i32, i32, usize); 4] = [(0, -1, 0), (0, 1, 1), (-1, 0, 2), (1, 0, 3)];
            let mut spread = [0usize; 4]; // up, down, left, right

            for &(dx, dy, dir_idx) in &dirs {
                for i in 1..=power as i32 {
                    let tx = pos.index_x as i32 + dx * i;
                    let ty = pos.index_y as i32 + dy * i;

                    if tx < 0 || ty < 0 {
                        break;
                    }
                    let target = MapIndex {
                        index_x: tx as u32,
                        index_y: ty as u32,
                    };
                    if target.index_y >= self.map_manager.height()
                        || target.index_x >= self.map_manager.width()
                    {
                        break;
                    }

                    let tile_type = self.map_manager.get_tile_type(&target);

                    if tile_type == MapTileType::Wall {
                        break;
                    }

                    spread[dir_idx] = spread[dir_idx].max(i as usize);

                    if tile_type == MapTileType::Brick {
                        let already = result
                            .ruin_brick_positions
                            .iter()
                            .any(|p| p.index_x == target.index_x && p.index_y == target.index_y);
                        if !already {
                            result.ruin_brick_positions.push(target);
                        }
                        break;
                    }

                    if tile_type == MapTileType::Item {
                        let already = result
                            .destroy_item_positions
                            .iter()
                            .any(|p| p.index_x == target.index_x && p.index_y == target.index_y);
                        if !already {
                            result.destroy_item_positions.push(target);
                        }
                        break;
                    }

                    if tile_type == MapTileType::Bomb {
                        let chain_key = (target.index_x, target.index_y);
                        if !processed.contains(&chain_key)
                            && !to_process
                                .iter()
                                .any(|p| p.index_x == target.index_x && p.index_y == target.index_y)
                        {
                            result.explode_bomb_positions.push(target.clone());
                            to_process.push(target);
                        }
                        break;
                    }
                    // empty — fire continues
                }
            }

            result.show_fire_configs.push(FireObjConfig {
                center_x: pos.index_x as usize,
                center_y: pos.index_y as usize,
                vertical_start: spread[0],
                vertical_end: spread[1],
                horizontal_start: spread[2],
                horizontal_end: spread[3],
            });
        }

        result
    }

    /// Apply explosion data: spawn fires, remove bombs, ruin bricks (with random item drops),
    /// destroy items. Returns list of newly spawned `(MapIndex, ItemType)`.
    pub fn handle_render_explode_by_data(
        &mut self,
        explode_data: ExplodeData,
    ) -> Vec<(MapIndex, ItemType)> {
        // Spawn fires
        for fc in explode_data.show_fire_configs {
            self.fires.push(FireObj::new(fc));
        }

        // Decrement usedBombNum for bomb owners and remove bombs from map and bombs list
        for pos in &explode_data.explode_bomb_positions {
            let man_key = self
                .bombs
                .iter()
                .find(|b| {
                    let idx = b.base.get_map_index();
                    idx.index_x == pos.index_x && idx.index_y == pos.index_y
                })
                .map(|b| b.man_sprite_key.clone());
            if let Some(key) = man_key {
                if let Some(owner) = self.get_mut_ref_player_by_key(&key) {
                    owner.used_bomb_num = owner.used_bomb_num.saturating_sub(1);
                }
            }
            self.bombs.retain(|b| {
                let idx = b.base.get_map_index();
                idx.index_x != pos.index_x || idx.index_y != pos.index_y
            });
            self.map_manager.clean_tile(pos);
        }

        // Ruin bricks and possibly spawn items
        let mut spawned_items: Vec<(MapIndex, ItemType)> = vec![];
        let mut rng = rand::thread_rng();

        for pos in &explode_data.ruin_brick_positions {
            self.map_manager.clean_tile(pos);
            self.ruining_bricks.push((pos.clone(), BRICK_RUIN_COUNTDOWN_MS));

            // 3/5 chance to drop an item (matches TypeScript: randomInt <= 2 out of 0..4)
            if rng.gen_range(0u8..5) <= 2 {
                let item_type = match rng.gen_range(0u8..3) {
                    0 => ItemType::Speed,
                    1 => ItemType::MoreBomb,
                    _ => ItemType::Fire,
                };
                let item = ItemObj::new(pos, item_type.clone());
                self.map_manager.set_tile(pos, MapTile::Item(item));
                spawned_items.push((pos.clone(), item_type));
            }
        }

        // Destroy items caught in explosion
        for pos in &explode_data.destroy_item_positions {
            self.map_manager.clean_tile(pos);
        }

        spawned_items
    }

    // ========================
    // Item events
    // ========================

    pub fn handle_create_item_event(&mut self, x: u32, y: u32, item_type: ItemType) {
        let index = MapIndex { index_x: x, index_y: y };
        let item = ItemObj::new(&index, item_type);
        self.map_manager.set_tile(&index, MapTile::Item(item));
    }

    pub fn handle_remove_item_event(&mut self, x: u32, y: u32) {
        let index = MapIndex { index_x: x, index_y: y };
        if self.map_manager.get_tile_type(&index) == MapTileType::Item {
            self.map_manager.clean_tile(&index);
        }
    }

    // ========================
    // Player item pickup
    // ========================

    /// Check if any player is standing on an item tile and apply its effect.
    /// Returns the list of `(ManSpriteKey, tile index, ItemType)` for each pickup.
    pub fn handle_item_pickups(&mut self) -> Vec<(ManSpriteKey, MapIndex, ItemType)> {
        let player_infos: Vec<(ManSpriteKey, MapIndex)> = self
            .players
            .iter()
            .filter(|p| p.is_alive)
            .map(|p| (p.man_sprite_key.clone(), p.base.get_center_map_index()))
            .collect();

        let mut pickups: Vec<(ManSpriteKey, MapIndex, ItemType)> = vec![];

        for (key, index) in player_infos {
            let item_type = match self
                .map_manager
                .map
                .get(index.index_y as usize)
                .and_then(|r| r.get(index.index_x as usize))
            {
                Some(Some(MapTile::Item(item))) => Some(item.item_type.clone()),
                _ => None,
            };
            if let Some(it) = item_type {
                if let Some(player) = self.get_mut_ref_player_by_key(&key) {
                    player.eat_item(&it);
                }
                pickups.push((key, index.clone(), it));
                self.map_manager.clean_tile(&index);
            }
        }

        pickups
    }

    // ========================
    // Bomb placement
    // ========================

    fn get_mut_ref_player_by_key(&mut self, man_key: &ManSpriteKey) -> Option<&mut ManObj> {
        self.players.iter_mut().find(|p| &p.man_sprite_key == man_key)
    }

    fn get_ref_player_by_key(&self, man_key: &ManSpriteKey) -> Option<&ManObj> {
        self.players.iter().find(|p| &p.man_sprite_key == man_key)
    }

    pub fn handle_player_place_bomb(
        &mut self,
        payload: &ClientGenerateBombPayload,
    ) -> Option<PlaceBombPayload> {
        let bomb_index = MapIndex {
            index_x: payload.index_x,
            index_y: payload.index_y,
        };
        let player: &ManObj = self.get_ref_player_by_key(&payload.man_key)?;
        if player.used_bomb_num >= player.bomb_num {
            return None;
        }
        let bomb_power = player.bomb_power;
        let tile_type = self.map_manager.get_tile_type(&bomb_index);
        let can_place_at_tile = matches!(tile_type, MapTileType::Empty | MapTileType::Item);
        if !can_place_at_tile {
            return None;
        }
        let bomb = BombObj::new(&bomb_index, bomb_power, payload.man_key.clone());
        let bomb_pos = tran_index_to_pos(&bomb_index);
        let mut_player: &mut ManObj = self.get_mut_ref_player_by_key(&payload.man_key)?;
        mut_player.can_pass_bomb_pos_list.push(bomb_pos);
        mut_player.used_bomb_num += 1;

        self.map_manager.set_tile(&bomb_index, MapTile::Bomb);
        self.bombs.push(bomb);
        let result = PlaceBombPayload {
            man_key: payload.man_key.clone(),
            x: bomb_index.index_x,
            y: bomb_index.index_y,
            bomb_power,
        };
        Some(result)
    }


    // ========================
    // Player movement
    // ========================

    /// Validate and apply a player position change (pixel-space movement with slide assist).
    /// Returns the accepted MovePayload, or None if the move is fully blocked.
    pub fn handle_player_position_change(
        &mut self,
        man_sprite_key: &ManSpriteKey,
        pressed_dir: &ManDirection,
    ) -> Option<MovePayload> {
        let (prev_x, prev_y, speed) = {
            let player = self.get_ref_player_by_key(man_sprite_key)?;
            let pos = player.base.get_position();
            (pos.pos_x, pos.pos_y, player.speed)
        };

        let (mut target_x, mut target_y) = (prev_x, prev_y);
        match pressed_dir {
            ManDirection::Up => target_y = target_y.saturating_sub(speed),
            ManDirection::Down => target_y = target_y.saturating_add(speed),
            ManDirection::Left => target_x = target_x.saturating_sub(speed),
            ManDirection::Right => target_x = target_x.saturating_add(speed),
        }

        let mut can_move = {
            let player = self.get_ref_player_by_key(man_sprite_key)?;
            self.map_manager.can_man_move_by_position(
                &Position { pos_x: target_x, pos_y: target_y },
                player,
            )
        };
        let mut final_x = target_x;
        let mut final_y = target_y;

        if !can_move {
            let threshold = speed;
            match pressed_dir {
                ManDirection::Left | ManDirection::Right => {
                    let offset = prev_y % TILE_WIDTH;
                    if offset != 0 {
                        if offset <= threshold {
                            final_y = prev_y - offset;
                            final_x = target_x;
                        } else if TILE_WIDTH - offset <= threshold {
                            final_y = prev_y + (TILE_WIDTH - offset);
                            final_x = target_x;
                        }
                        can_move = {
                            let player = self.get_ref_player_by_key(man_sprite_key)?;
                            self.map_manager.can_man_move_by_position(
                                &Position { pos_x: final_x, pos_y: final_y },
                                player,
                            )
                        };
                    }
                }
                ManDirection::Up | ManDirection::Down => {
                    let offset = prev_x % TILE_WIDTH;
                    if offset != 0 {
                        if offset <= threshold {
                            final_x = prev_x - offset;
                            final_y = target_y;
                        } else if TILE_WIDTH - offset <= threshold {
                            final_x = prev_x + (TILE_WIDTH - offset);
                            final_y = target_y;
                        }
                        can_move = {
                            let player = self.get_ref_player_by_key(man_sprite_key)?;
                            self.map_manager.can_man_move_by_position(
                                &Position { pos_x: final_x, pos_y: final_y },
                                player,
                            )
                        };
                    }
                }
            }

            if !can_move {
                match pressed_dir {
                    ManDirection::Up => {
                        final_y = ((target_y + TILE_WIDTH - 1) / TILE_WIDTH) * TILE_WIDTH
                    }
                    ManDirection::Down => final_y = (target_y / TILE_WIDTH) * TILE_WIDTH,
                    ManDirection::Left => {
                        final_x = ((target_x + TILE_WIDTH - 1) / TILE_WIDTH) * TILE_WIDTH
                    }
                    ManDirection::Right => final_x = (target_x / TILE_WIDTH) * TILE_WIDTH,
                }
                can_move = {
                    let player = self.get_ref_player_by_key(man_sprite_key)?;
                    self.map_manager.can_man_move_by_position(
                        &Position { pos_x: final_x, pos_y: final_y },
                        player,
                    )
                };
            }
        }

        // Update can_pass_bomb list
        self.handle_can_pass_bomb(man_sprite_key, final_x, final_y);

        // Apply new position and direction
        if let Some(player) = self.get_mut_ref_player_by_key(man_sprite_key) {
            player.base.position.pos_x = final_x;
            player.base.position.pos_y = final_y;
            player.set_dir(pressed_dir.clone());
            player.set_moving(true);
        }

        if can_move {
            Some(MovePayload {
                man_key: man_sprite_key.clone(),
                new_x: final_x,
                new_y: final_y,
                dir: pressed_dir.clone(),
                is_moving: true,
            })
        } else {
            None
        }
    }

    pub fn handle_can_pass_bomb(
        &mut self,
        man_sprite_key: &ManSpriteKey,
        final_x: u32,
        final_y: u32,
    ) {
        if let Some(player) = self.get_mut_ref_player_by_key(man_sprite_key) {
            player.can_pass_bomb_pos_list.retain(|bomb_pos| {
                let dx = (bomb_pos.pos_x as i64 - final_x as i64).unsigned_abs();
                let dy = (bomb_pos.pos_y as i64 - final_y as i64).unsigned_abs();
                dx < TILE_WIDTH as u64 && dy < TILE_WIDTH as u64
            });
        }
    }

    // ========================
    // Player death
    // ========================

    pub fn handle_player_die(&mut self, man_key: &ManSpriteKey) {
        if let Some(player) = self.get_mut_ref_player_by_key(man_key) {
            player.is_alive = false;
        }
    }
}
