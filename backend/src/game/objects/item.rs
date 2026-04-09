use crate::game::types::{ItemType, MapIndex, ObjType};
use super::base::BaseObj;

pub struct ItemObj {
    pub base: BaseObj,
    pub item_type: ItemType,
}

impl ItemObj {
    pub fn new(index: &MapIndex, item_type: ItemType) -> Self {
        Self {
            base: BaseObj::new(index, ObjType::Item),
            item_type,
        }
    }
}
