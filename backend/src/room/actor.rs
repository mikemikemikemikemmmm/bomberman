use axum::extract::ws::Message;
use tokio::sync::mpsc::UnboundedReceiver;
use tracing::info;

use crate::game::actor::run_game_actor;
use crate::game::command::GameCommand;
use crate::game::types::ManSpriteKey;
use crate::lobby::command::LobbyCommand;
use crate::room::command::RoomCommand;
use crate::room::constant::MAX_ROOM_PLAYER_NUM;
use crate::room::room::{ClientDataForState, RoomState};
use crate::state::AppState;
use crate::ws::message::{make_ws_msg_error, make_ws_msg_room_state};

pub async fn run_room_actor(
    room_id: u32,
    host_client_id: u32,
    host_client_name: String,
    mut rx: UnboundedReceiver<RoomCommand>,
    state: &'static AppState,
) {
    let mut room = RoomState::new(room_id, host_client_id, host_client_name);

    // Publish initial room to lobby.
    state.room_list_cache.insert(room_id, room.to_list_item());
    let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);
    broadcast_room_state(&room, state);

    while let Some(cmd) = rx.recv().await {
        match cmd {
            RoomCommand::PlayerJoin { client_id, client_name } => {
                if room.players.len() >= MAX_ROOM_PLAYER_NUM {
                    send_error(client_id, "Room is full", state);
                    continue;
                }
                let sprite_key = ManSpriteKey::from_index(room.players.len());
                room.players.push(ClientDataForState {
                    id: client_id,
                    name: client_name,
                    is_ready: false,
                    is_host: false,
                    man_sprite_key: sprite_key,
                });
                if let Some(mut cs) = state.client_state_map.get_mut(&client_id) {
                    cs.room_id = Some(room_id);
                }
                let _ = state.lobby_sender.send(LobbyCommand::ClientLeft(client_id));
                broadcast_room_state(&room, state);
                state.room_list_cache.insert(room_id, room.to_list_item());
                let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);
            }

            RoomCommand::PlayerLeave { client_id } => {
                room.players.retain(|p| p.id != client_id);
                if let Some(mut cs) = state.client_state_map.get_mut(&client_id) {
                    cs.room_id = None;
                }
                let _ = state.lobby_sender.send(LobbyCommand::ClientJoined(client_id));

                if room.players.is_empty() {
                    state.room_list_cache.remove(&room_id);
                    state.room_sender_map.remove(&room_id);
                    let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);
                    info!("room {} closed (empty)", room_id);
                    break;
                }
                // Reassign host if necessary.
                if !room.players.iter().any(|p| p.is_host) {
                    room.players[0].is_host = true;
                }
                broadcast_room_state(&room, state);
                state.room_list_cache.insert(room_id, room.to_list_item());
                let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);
            }

            RoomCommand::ToggleReady { client_id } => {
                if let Some(p) = room.players.iter_mut().find(|p| p.id == client_id) {
                    p.is_ready = !p.is_ready;
                }
                broadcast_room_state(&room, state);
            }

            RoomCommand::ChangeMap { map_id } => {
                room.map_id = map_id;
                broadcast_room_state(&room, state);
                state.room_list_cache.insert(room_id, room.to_list_item());
                let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);
            }

            RoomCommand::StartGame { host_client_id } => {
                let is_host = room.players.iter().any(|p| p.id == host_client_id && p.is_host);
                if !is_host {
                    continue;
                }
                let all_ready = room.players.iter().all(|p| p.is_ready || p.is_host);
                if !all_ready {
                    send_error(host_client_id, "Not all players are ready", state);
                    continue;
                }

                let game_id = state.alloc_game_id();
                let (game_tx, game_rx) = tokio::sync::mpsc::unbounded_channel::<GameCommand>();
                state.game_sender_map.insert(game_id, game_tx);

                for p in &room.players {
                    if let Some(mut cs) = state.client_state_map.get_mut(&p.id) {
                        cs.game_id = Some(game_id);
                        cs.room_id = None;
                    }
                }

                state.room_list_cache.remove(&room_id);
                state.room_sender_map.remove(&room_id);
                let _ = state.lobby_sender.send(LobbyCommand::BroadcastRoomList);

                let players: Vec<ClientDataForState> = room.players.drain(..).collect();
                tokio::spawn(run_game_actor(game_id, players, 1, game_rx, state));
                info!("room {} started game {}", room_id, game_id);
                break;
            }
        }
    }
}

fn broadcast_room_state(room: &RoomState, state: &AppState) {
    let msg = Message::Text(make_ws_msg_room_state(room.id, room.map_id, &room.to_client_data()).into());
    for p in &room.players {
        state.send_to_client(p.id, msg.clone());
    }
}

fn send_error(client_id: u32, msg: &str, state: &AppState) {
    state.send_to_client(client_id, Message::Text(make_ws_msg_error(msg).into()));
}
