use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

use tracing::info;

use crate::game::obj_manager::game_state::GameState;
use crate::ws::message::{GameOverPayload, GameStateChangedPayload};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub fn check_game_over(gs: &mut GameState, changes: &mut GameStateChangedPayload) {
    if gs.game_over {
        return;
    }

    let alive: Vec<_> = gs
        .players
        .iter()
        .filter(|p| p.is_alive.load(Ordering::Relaxed))
        .map(|p| p.man_sprite_key.clone())
        .collect();

    let winner = if now_ms() >= gs.game_end_time {
        gs.game_over = true;
        if alive.len() == 1 {
            alive.into_iter().next()
        } else {
            None
        }
    } else if alive.len() <= 1 {
        gs.game_over = true;
        alive.into_iter().next()
    } else {
        return;
    };

    info!("game over, winner: {:?}", winner);
    changes.game_over = Some(GameOverPayload { winner_key: winner });
}
