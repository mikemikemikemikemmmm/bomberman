use std::sync::atomic::Ordering;

use crate::game::state::game_state::GameState;

pub fn handle_player_disconnected(gs: &mut GameState, client_id: u32) {
    for mut entry in gs.players.iter_mut() {
        if entry.client_id == client_id {
            entry.is_alive.store(false, Ordering::Relaxed);
            break;
        }
    }
}
