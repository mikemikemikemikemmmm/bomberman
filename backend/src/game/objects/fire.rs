use crate::game::config::FIRE_COUNTDOWN_MS;
use crate::game::types::ObjType;

pub struct FireObjConfig {
    pub center_x: usize,
    pub center_y: usize,
    pub vertical_start: usize,
    pub vertical_end: usize,
    pub horizontal_start: usize,
    pub horizontal_end: usize,
}

pub struct FireObj {
    pub obj_type: ObjType,
    pub remaining_ms: u32,
    pub config: FireObjConfig,
}

impl FireObj {
    pub fn new(config: FireObjConfig) -> Self {
        Self {
            obj_type: ObjType::Fire,
            remaining_ms: FIRE_COUNTDOWN_MS,
            config,
        }
    }
}
