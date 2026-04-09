use crate::game::config::{BASE_MAN_SPEED, MAX_BOMB_NUM, MAX_BOMB_POWER, MAX_SPEED};
use crate::game::types::{ItemType, ManDirection, ManSpriteKey, MapIndex, ObjType, Position};
use super::base::BaseObj;

pub struct ManObj {
    pub base: BaseObj,
    pub is_alive: bool,
    pub man_sprite_key: ManSpriteKey,
    pub dir: ManDirection,
    pub is_moving: bool,
    pub used_bomb_num: u32,
    pub speed: u32,
    pub bomb_num: u32,
    pub bomb_power: u32,
    pub can_pass_bomb_pos_list: Vec<Position>,
}

impl ManObj {
    pub fn new(index: &MapIndex, man_sprite_key: ManSpriteKey) -> Self {
        Self {
            base: BaseObj::new(index, ObjType::Man),
            is_alive: true,
            man_sprite_key,
            dir: ManDirection::Down,
            is_moving: false,
            used_bomb_num: 0,
            speed: BASE_MAN_SPEED,
            bomb_num: 2,
            bomb_power: 2,
            can_pass_bomb_pos_list: vec![],
        }
    }

    pub fn set_dir(&mut self, dir: ManDirection) {
        if !self.is_alive {
            return;
        }
        self.dir = dir;
    }

    pub fn set_moving(&mut self, v: bool) {
        if !self.is_alive {
            return;
        }
        self.is_moving = v;
    }

    pub fn eat_item(&mut self, item_type: &ItemType) {
        match item_type {
            ItemType::Speed => self.speed = (self.speed + 1).min(MAX_SPEED),
            ItemType::MoreBomb => self.bomb_num = (self.bomb_num + 1).min(MAX_BOMB_NUM),
            ItemType::Fire => self.bomb_power = (self.bomb_power + 1).min(MAX_BOMB_POWER),
        }
    }
}
