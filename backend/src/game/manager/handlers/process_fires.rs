use std::time::{SystemTime, UNIX_EPOCH};

use crate::game::obj_manager::game_state::GameState;

fn now_ms_u128() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

pub fn process_fires(gs: &mut GameState) {
    let now = now_ms_u128();
    gs.fires.retain(|f| f.end_time > now);
}
