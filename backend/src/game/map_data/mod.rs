use std::collections::HashMap;
use std::sync::Mutex;

use once_cell::sync::Lazy;

use crate::game::{config::{MAP_H, MAP_W}, map_data::map1::MAP_1_MATRIX};

pub mod map1;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MapMatrixCell {
    Wall,
    Empty,
    Brick,
    MAN1,
    MAN2,
    MAN3,
    MAN4,
}

pub type MapMatrix = [[MapMatrixCell; MAP_W as usize]; MAP_H as usize];

pub struct MapData {
    pub game_end_max_minute: u32,
    pub matrix: MapMatrix,
}


pub static ALL_MAP_DATA: Lazy<HashMap<u32, MapData>> = Lazy::new(|| {
    let mut m = HashMap::new();

    let map_1_data = MapData {
        game_end_max_minute:10,
        matrix:MAP_1_MATRIX
    };

    m.insert(1, map_1_data);

    m
});
