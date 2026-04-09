use crate::game::{config::BRICK_RUIN_COUNTDOWN_MS, types::{MapIndex, ObjType}};
use super::base::BaseObj;
use crate::game::objects::base::BaseObjTrait;
pub struct BrickObj {
    pub base: BaseObj,
    pub is_ruining: bool,
    pub remaining_ms:u32,
}

impl BrickObj {
    pub fn new(index: &MapIndex) -> Self {
        Self {
            base: BaseObj::new(index, ObjType::Brick),
            is_ruining: false,
            remaining_ms:BRICK_RUIN_COUNTDOWN_MS
        }
    }

    pub fn trigger_ruin(&mut self) -> MapIndex {
        self.is_ruining = true;
        self.base.get_map_index()
    }
}
