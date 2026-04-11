use crate::game::config::TILE_WIDTH;
use crate::game::map_data::{MapData, MapMatrixCell};
use crate::game::manager::obj_manager::{MapMatrix, MapTile, MapTileType};
use crate::game::objects::brick::BrickObj;
use crate::game::objects::man::ManObj;
use crate::game::types::{ManSpriteKey, MapIndex, Position};
use crate::game::utils::tran_pos_to_index;

pub struct MapManager {
    pub map: MapMatrix,
}

// ========================
// Tile access helpers
// ========================
impl MapManager {
    pub fn get_tile_type(&self, index: &MapIndex) -> MapTileType {
        let (ix, iy) = (index.index_x as usize, index.index_y as usize);
        match self.map.get(iy).and_then(|row| row.get(ix)) {
            None | Some(None) => MapTileType::Empty,
            Some(Some(tile)) => tile.tile_type(),
        }
    }

    pub fn clean_tile(&mut self, index: &MapIndex) {
        let (ix, iy) = (index.index_x as usize, index.index_y as usize);
        if let Some(row) = self.map.get_mut(iy) {
            if let Some(cell) = row.get_mut(ix) {
                *cell = None;
            }
        }
    }

    pub fn set_tile(&mut self, index: &MapIndex, tile: MapTile) {
        let (ix, iy) = (index.index_x as usize, index.index_y as usize);
        if let Some(row) = self.map.get_mut(iy) {
            if let Some(cell) = row.get_mut(ix) {
                *cell = Some(tile);
            }
        }
    }

    pub fn take_tile(&mut self, index: &MapIndex) -> Option<MapTile> {
        let (ix, iy) = (index.index_x as usize, index.index_y as usize);
        self.map.get_mut(iy)?.get_mut(ix)?.take()
    }

    pub fn height(&self) -> u32 {
        self.map.len() as u32
    }

    pub fn width(&self) -> u32 {
        self.map.first().map_or(0, |row| row.len() as u32)
    }
}

impl MapManager {
    /// Build a MapManager from static map data and a list of participating players
    /// (ordered: first element gets MAN1 spawn, second gets MAN2, etc.).
    ///
    /// Returns the `MapManager` and the `ManObj` list populated from spawn cells.
    pub fn new(map_data: &MapData, player_man_keys: &[ManSpriteKey]) -> (Self, Vec<ManObj>) {
        let mut manager = Self { map: vec![] };
        let players = manager.init_by_map(map_data, player_man_keys);
        (manager, players)
    }

    // ========================
    // Movement validation
    // ========================

    pub fn can_man_move_by_position(&self, pos: &Position, man_obj: &ManObj) -> bool {
        let tw = TILE_WIDTH;
        let corners = [
            Position { pos_x: pos.pos_x, pos_y: pos.pos_y },
            Position { pos_x: pos.pos_x + tw - 1, pos_y: pos.pos_y },
            Position { pos_x: pos.pos_x, pos_y: pos.pos_y + tw - 1 },
            Position { pos_x: pos.pos_x + tw - 1, pos_y: pos.pos_y + tw - 1 },
        ];

        corners.iter().all(|p| {
            let map_index = tran_pos_to_index(p);
            let tile_type = self.get_tile_type(&map_index);

            match tile_type {
                MapTileType::Wall | MapTileType::Brick => false,
                MapTileType::Bomb => {
                    // Allow if the player is still overlapping the bomb tile they just placed
                    man_obj.can_pass_bomb_pos_list.iter().any(|bomb_pos| {
                        p.pos_x >= bomb_pos.pos_x
                            && p.pos_x < bomb_pos.pos_x + tw
                            && p.pos_y >= bomb_pos.pos_y
                            && p.pos_y < bomb_pos.pos_y + tw
                    })
                }
                _ => true,
            }
        })
    }

    // ========================
    // Initialisation
    // ========================

    fn init_by_map(
        &mut self,
        map_data: &MapData,
        player_man_keys: &[ManSpriteKey],
    ) -> Vec<ManObj> {
        let matrix = &map_data.matrix;
        let h = matrix.len();
        let w = matrix.first().map_or(0, |row| row.len());

        let mut map_matrix: MapMatrix = (0..h).map(|_| (0..w).map(|_| None).collect()).collect();
        let mut players: Vec<ManObj> = vec![];

        for (y, row) in matrix.iter().enumerate() {
            for (x, cell) in row.iter().enumerate() {
                let index = MapIndex {
                    index_x: x as u32,
                    index_y: y as u32,
                };

                match cell {
                    MapMatrixCell::Wall => {
                        map_matrix[y][x] = Some(MapTile::Wall);
                    }
                    MapMatrixCell::Brick => {
                        let brick = BrickObj::new(&index);
                        map_matrix[y][x] = Some(MapTile::Brick(brick));
                    }
                    MapMatrixCell::Empty => {
                        // leave as None
                    }
                    // Player spawn cells — create the ManObj at this position
                    spawn_cell => {
                        let man_key_opt = match spawn_cell {
                            MapMatrixCell::MAN1 => Some(ManSpriteKey::Man1),
                            MapMatrixCell::MAN2 => Some(ManSpriteKey::Man2),
                            MapMatrixCell::MAN3 => Some(ManSpriteKey::Man3),
                            MapMatrixCell::MAN4 => Some(ManSpriteKey::Man4),
                            _ => None,
                        };

                        if let Some(default_key) = man_key_opt {
                            // Use the caller-supplied key if provided (allows remapping slots).
                            let spawn_order = match default_key {
                                ManSpriteKey::Man1 => 0,
                                ManSpriteKey::Man2 => 1,
                                ManSpriteKey::Man3 => 2,
                                ManSpriteKey::Man4 => 3,
                            };
                            let man_key = player_man_keys
                                .get(spawn_order)
                                .cloned()
                                .unwrap_or(default_key);

                            let man = ManObj::new(&index, man_key);
                            players.push(man);
                            // Spawn cell is traversable — leave tile as None
                            map_matrix[y][x] = None;
                        }
                    }
                }
            }
        }

        self.map = map_matrix;
        players
    }
}
