use crate::game::{
    config::TILE_WIDTH,
    types::{MapIndex, Position},
};

pub fn tran_index_to_pos(i: &MapIndex) -> Position {
    Position {
        pos_x: i.index_x * TILE_WIDTH,
        pos_y: i.index_y * TILE_WIDTH,
    }
}

pub fn tran_pos_to_index(p: &Position) -> MapIndex {
    MapIndex {
        index_x: p.pos_x / TILE_WIDTH,
        index_y: p.pos_y / TILE_WIDTH,
    }
}
