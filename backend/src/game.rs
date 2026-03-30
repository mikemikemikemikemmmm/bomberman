use rand::Rng;
use std::collections::HashSet;
use crate::messages::{GridPos, ItemType, ManSpriteKey};

pub const MAP_W: i32 = 10;
pub const MAP_H: i32 = 10;
pub const TILE_SIZE: f32 = 64.0;
pub const BOMB_FUSE_SECS: u64 = 3;
pub const GAME_DURATION_MS: i64 = 600_000; // 10 minutes

#[derive(Debug, Clone, PartialEq)]
pub enum MapCell {
    Wall,
    Brick,
    Empty,
}

#[derive(Debug, Clone)]
pub struct Item {
    pub x: i32,
    pub y: i32,
    pub item_type: ItemType,
}

pub struct ExplosionResult {
    pub cells: Vec<GridPos>,
    pub destroyed_bricks: Vec<GridPos>,
    pub dropped_items: Vec<(i32, i32, ItemType)>,
    pub hit_player_keys: Vec<ManSpriteKey>,
}

pub struct GameState {
    pub map: Vec<Vec<MapCell>>,
    pub items: Vec<Item>,
    pub alive_players: HashSet<ManSpriteKey>,
    pub game_end_time: i64,
}

impl GameState {
    pub fn new(player_keys: &[ManSpriteKey]) -> Self {
        let map = generate_map();
        let now_ms = now_ms();
        let mut alive_players = HashSet::new();
        for key in player_keys {
            alive_players.insert(key.clone());
        }
        Self {
            map,
            items: Vec::new(),
            alive_players,
            game_end_time: now_ms + GAME_DURATION_MS,
        }
    }

    /// Calculate explosion cells, destroy bricks, drop items, detect player hits.
    /// `player_positions`: current grid positions per player (grid x, grid y).
    pub fn explode(
        &mut self,
        bomb_x: i32,
        bomb_y: i32,
        power: u32,
        player_positions: &[(ManSpriteKey, i32, i32)],
    ) -> ExplosionResult {
        let mut cells = vec![GridPos { x: bomb_x, y: bomb_y }];
        let mut destroyed_bricks = Vec::new();

        for (dx, dy) in [(0i32, -1i32), (0, 1), (-1, 0), (1, 0)] {
            for dist in 1..=(power as i32) {
                let nx = bomb_x + dx * dist;
                let ny = bomb_y + dy * dist;
                if nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H {
                    break;
                }
                match self.map[ny as usize][nx as usize] {
                    MapCell::Wall => break,
                    MapCell::Brick => {
                        cells.push(GridPos { x: nx, y: ny });
                        destroyed_bricks.push(GridPos { x: nx, y: ny });
                        self.map[ny as usize][nx as usize] = MapCell::Empty;
                        break;
                    }
                    MapCell::Empty => {
                        cells.push(GridPos { x: nx, y: ny });
                    }
                }
            }
        }

        // Drop items on destroyed bricks
        let mut dropped_items = Vec::new();
        let mut rng = rand::thread_rng();
        for brick in &destroyed_bricks {
            if rng.gen_bool(0.35) {
                let item_type = match rng.gen_range(0u8..3) {
                    0 => ItemType::Fire,
                    1 => ItemType::Speed,
                    _ => ItemType::MoreBomb,
                };
                dropped_items.push((brick.x, brick.y, item_type.clone()));
                self.items.push(Item { x: brick.x, y: brick.y, item_type });
            }
        }

        // Detect player hits
        let mut hit_player_keys = Vec::new();
        for (key, px, py) in player_positions {
            if self.alive_players.contains(key)
                && cells.iter().any(|c| c.x == *px && c.y == *py)
            {
                hit_player_keys.push(key.clone());
                self.alive_players.remove(key);
            }
        }

        ExplosionResult { cells, destroyed_bricks, dropped_items, hit_player_keys }
    }

    /// Try to consume an item at grid position. Returns the item type if found.
    pub fn consume_item(&mut self, x: i32, y: i32) -> Option<ItemType> {
        if let Some(pos) = self.items.iter().position(|i| i.x == x && i.y == y) {
            Some(self.items.remove(pos).item_type)
        } else {
            None
        }
    }
}

/// Classic Bomberman 10×10 map:
/// - Walls on border
/// - Pillar walls at every (even_row, even_col) interior
/// - Random bricks elsewhere, with safe zones at corners
fn generate_map() -> Vec<Vec<MapCell>> {
    let mut rng = rand::thread_rng();
    let mut map = vec![vec![MapCell::Empty; MAP_W as usize]; MAP_H as usize];

    // Border walls
    for x in 0..MAP_W as usize {
        map[0][x] = MapCell::Wall;
        map[(MAP_H - 1) as usize][x] = MapCell::Wall;
    }
    for y in 0..MAP_H as usize {
        map[y][0] = MapCell::Wall;
        map[y][(MAP_W - 1) as usize] = MapCell::Wall;
    }

    // Interior pillar walls at (even row, even col)
    for y in (2..MAP_H - 1).step_by(2) {
        for x in (2..MAP_W - 1).step_by(2) {
            map[y as usize][x as usize] = MapCell::Wall;
        }
    }

    // Corner safe zones (no bricks adjacent to spawn points)
    let safe: &[(i32, i32)] = &[
        (1, 1), (2, 1), (1, 2),  // man1 top-left
        (8, 1), (7, 1), (8, 2),  // man2 top-right
        (1, 8), (2, 8), (1, 7),  // man3 bottom-left
        (8, 8), (7, 8), (8, 7),  // man4 bottom-right
    ];

    for y in 1..(MAP_H - 1) {
        for x in 1..(MAP_W - 1) {
            if map[y as usize][x as usize] == MapCell::Empty {
                let in_safe = safe.iter().any(|(sx, sy)| *sx == x && *sy == y);
                if !in_safe && rng.gen_bool(0.55) {
                    map[y as usize][x as usize] = MapCell::Brick;
                }
            }
        }
    }

    map
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}
