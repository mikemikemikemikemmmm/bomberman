use crate::game::config::TILE_WIDTH;
use crate::game::types::{MapIndex, ObjType, Position};
use crate::game::utils::tran_pos_to_index;

pub struct BaseObj {
    pub obj_type: ObjType,
    pub position: Position,
}

pub trait BaseObjTrait {
    fn get_obj_type(&self) -> &ObjType;
    fn get_position(&self) -> &Position;

    fn get_map_index(&self) -> MapIndex {
        tran_pos_to_index(self.get_position())
    }

    fn get_center_map_index(&self) -> MapIndex {
        let half = TILE_WIDTH / 2;
        let pos = self.get_position();

        let new_p = Position {
            pos_x: pos.pos_x + half,
            pos_y: pos.pos_y + half,
        };

        tran_pos_to_index(&new_p)
    }
}
impl BaseObjTrait for BaseObj {
    fn get_obj_type(&self) -> &ObjType {
        &self.obj_type
    }

    fn get_position(&self) -> &Position {
        &self.position
    }
}

impl BaseObj {
    pub fn new(index: &MapIndex, obj_type: ObjType) -> Self {
        Self {
            obj_type,
            position: Position {
                pos_x: index.index_x * TILE_WIDTH,
                pos_y: index.index_y * TILE_WIDTH,
            },
        }
    }
}
