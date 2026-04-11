use std::collections::VecDeque;

use axum::extract::ws::Message;
use tokio::sync::mpsc::UnboundedReceiver;
use tracing::info;

use crate::game::event::command::GameCommand;
use crate::game::event::EventManager;
use crate::game::config::GAME_TICK_MS;
use crate::game::map_data::ALL_MAP_DATA;
use crate::room::room::ClientDataForState;
use crate::state::AppState;
use crate::ws::message::{make_ws_msg_game_started, SendGameStartedPayload};

pub async fn run_game_actor(
    game_id: u32,
    players: Vec<ClientDataForState>,
    map_id: u32,
    mut rx: UnboundedReceiver<GameCommand>,
    state: &'static AppState,
) {
    let player_ids: Vec<u32> = players.iter().map(|p| p.id).collect();
    info!("game {} started with {} players", game_id, player_ids.len());

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
            broadcast(Message::Text("noMap".to_string()), None);
            return;
        }
    };

    let mut event_manager = EventManager::new(map_data, &players);

    let start_msg = Message::Text(
        make_ws_msg_game_started(SendGameStartedPayload {
            game_id,
            game_end_time: event_manager.game_end_time,
        })
        .into(),
    );
    broadcast(start_msg, None);

    let mut command_list: VecDeque<GameCommand> = VecDeque::new();
    let mut ticker =
        tokio::time::interval(std::time::Duration::from_millis(GAME_TICK_MS as u64));

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                event_manager.consume_commands(&mut command_list, state);
                if event_manager.game_over {
                    break;
                }
            }
            Some(cmd) = rx.recv() => {
                command_list.push_back(cmd);
            }
            else => {
                break;
            }
        }
    }

    info!("game {} ended", game_id);
    state.game_sender_map.remove(&game_id);
}
