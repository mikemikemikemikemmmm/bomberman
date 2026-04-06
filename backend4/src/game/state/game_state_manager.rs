use std::collections::VecDeque;

use axum::extract::ws::Message;

use crate::game::command::GameCommand;
use crate::game::state::game_state::GameState;
use crate::game::state::handlers::{
    check_game_over, handle_player_create_bomb, handle_player_disconnected, handle_player_move,
    process_bombs, process_destroying_bricks, process_fires, process_item_pickups,
};
use crate::state::AppState;
use crate::ws::message::{
    make_ws_msg_game_state_changed, make_ws_msg_time_sync_pong, GameStateChangedPayload,
    TimeSyncPongPayload,
};

fn broadcast(msg: Message, player_ids: &[u32], state: &'static AppState) {
    for &id in player_ids {
        state.send_to_client(id, msg.clone());
    }
}

pub struct GameStateManager;

impl GameStateManager {
    pub fn consume_received_commands(
        command_list: &mut VecDeque<GameCommand>,
        game_id: u32,
        player_ids: &[u32],
        state: &'static AppState,
        game_state: &mut GameState,
    ) {
        let mut changes = GameStateChangedPayload::default();

        // Process all queued commands
        while let Some(cmd) = command_list.pop_front() {
            match cmd {
                GameCommand::PlayerMove(payload) => {
                    handle_player_move(game_state, &payload);
                    changes.player_moves.push(payload);
                }
                GameCommand::GenerateBomb(payload) => {
                    handle_player_create_bomb(game_state, &payload);
                    changes.new_bombs.push(payload);
                }
                GameCommand::PlayerDisconnected(client_id) => {
                    handle_player_disconnected(game_state, client_id);
                }
                GameCommand::TimeSyncPing { client_id, sent_at } => {
                    // Respond immediately — not part of game state
                    state.send_to_client(
                        client_id,
                        Message::Text(
                            make_ws_msg_time_sync_pong(TimeSyncPongPayload {
                                sent_at,
                                to: client_id.to_string(),
                            })
                            .into(),
                        ),
                    );
                }
            }
        }

        // Tick-based game logic — all results accumulate into `changes`
        process_bombs(game_state, &mut changes);
        process_fires(game_state);
        process_destroying_bricks(game_state);
        process_item_pickups(game_state, &mut changes);
        check_game_over(game_state, &mut changes);

        // Send one batched update to all players
        if !changes.is_empty() {
            let msg = Message::Text(make_ws_msg_game_state_changed(&changes).into());
            broadcast(msg, player_ids, state);
        }
    }
}
