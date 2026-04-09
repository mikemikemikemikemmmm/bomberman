use crate::game::config::BOMB_COUNTDOWN_MS;
use crate::game::types::{ManSpriteKey, MapIndex, ObjType};
use super::base::BaseObj;

pub struct BombObj {
    pub base: BaseObj,
    pub remaining_ms: u32,
    pub power: u32,
    pub man_sprite_key: ManSpriteKey,
}

impl BombObj {
    pub fn new(index: &MapIndex, power: u32, man_sprite_key: ManSpriteKey) -> Self {
        Self {
            base: BaseObj::new(index, ObjType::Bomb),
            remaining_ms: BOMB_COUNTDOWN_MS,
            power,
            man_sprite_key,
        }
    }
}
