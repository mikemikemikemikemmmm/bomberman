use std::time::{SystemTime, UNIX_EPOCH};

use crate::game::state::game_state::GameState;

fn now_ms_u128() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

pub fn process_destroying_bricks(gs: &mut GameState) {
    let now = now_ms_u128();
    gs.destroying_bricks.retain(|b| b.end_time > now);
}
