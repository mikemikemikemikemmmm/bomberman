use std::collections::VecDeque;

use axum::extract::ws::Message;
use tokio::sync::mpsc::UnboundedReceiver;
use tracing::info;

use crate::game::command::GameCommand;
use crate::game::config::GAME_TICK_MS;
use crate::game::state::game_state::GameState;
use crate::game::state::game_state_manager::GameStateManager;
use crate::game::map::ALL_MAP_DATA;
use crate::room::room::ClientDataForState;
use crate::state::AppState;
use crate::ws::message::{make_ws_msg_game_started, GameStartedPayload};
pub async fn run_game_actor(
    game_id: u32,
    players: Vec<ClientDataForState>,
    map_id: u32,
    mut rx: UnboundedReceiver<GameCommand>,
    state: &'static AppState,
) {
    let player_ids: Vec<u32> = players.iter().map(|p| p.id).collect();
    info!("game {} started with {} players", game_id, player_ids.len());

    // Broadcast helper
    let broadcast = |msg: Message, exclude_id: Option<u32>| {
        for &id in &player_ids {
            if Some(id) == exclude_id {
                continue;
            }
            state.send_to_client(id, msg.clone());
        }
    };
    let map_data = match ALL_MAP_DATA.get(&map_id) {
        Some(data) => data,
        None => {
            info!("map {} not found for game {}", map_id, game_id);
            broadcast(Message::Text("noMap".to_string()),None);
            return;
        }
    };

    let mut game_state = GameState::new(map_data, &players);
    // Notify all players that the game has started
    let start_msg = Message::Text(
        make_ws_msg_game_started(GameStartedPayload {
            game_id,
            game_end_time: game_state.game_end_time,
        })
        .into(),
    );
    broadcast(start_msg, None);

    let mut command_list:VecDeque<GameCommand> = VecDeque::new();
    let mut ticker = tokio::time::interval(std::time::Duration::from_millis(GAME_TICK_MS as u64));
    loop {
        tokio::select! {
            _ = ticker.tick() => {
                GameStateManager::consume_received_commands(&mut command_list, game_id, &player_ids, state, &mut game_state);

                if game_state.game_over {
                    break;
                }
            }

            Some(cmd) = rx.recv() => {
                command_list.push_back(cmd);
            }

            else => {
                // rx 已關閉
                break;
            }
        }
    }

    info!("game {} ended", game_id);
    state.game_sender_map.remove(&game_id);
}
