use std::arch::global_asm;

use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tracing::{error, info};

use crate::game::actor::run_game_actor;
use crate::game::command::GameCommand;
use crate::lobby::command::LobbyCommand;
use crate::room::command::RoomCommand;
use crate::room::room::ClientDataForState;
use crate::state::{get_global_state, AppState, ClientState};
use crate::ws::message::{
    make_ws_msg_connected, ConnectedPayload, GenerateBombPayload, PlayerMovePayload,
    TimeSyncPingPayload, WsRawMessage,
};

pub async fn handle_init_socket(socket: WebSocket) {
    let state = get_global_state();
    // let client_id = state.alloc_client_id();
    let client_id =1;
    let (sender, mut receiver) = mpsc::unbounded_channel::<Message>();
    state.client_sender_map.insert(client_id, sender.clone());
    state.client_state_map.insert(
        client_id,
        ClientState {
            id: client_id,
            name: String::new(),
            room_id: None,
            game_id: Some(1),
        },
    );

    // Notify the lobby actor that a new client is waiting.
    let _ = state
        .lobby_sender
        .send(LobbyCommand::ClientJoined(client_id));
    info!("client {} connected", client_id);

    let (mut ws_sender, mut ws_receiver) = socket.split();
    // Dedicated task: forward mpsc messages to the WebSocket.
    let send_task = tokio::spawn(async move {
        while let Some(msg) = receiver.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Tell the client their assigned ID.
    state.send_to_client(
        client_id,
        Message::Text(make_ws_msg_connected(ConnectedPayload { user_id: client_id }).into()),
    );
    test_game_start(client_id);
    // let _ = sender.send(Message::Text(
    //     make_ws_msg("startGame", &ConnectedPayload { user_id: client_id }).into(),
    // ));

    // Receive loop.
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Err(e) = handle_msg(client_id, &text, state).await {
                    error!("handle_msg error for client {}: {}", client_id, e);
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    info!("client {} disconnected", client_id);
    cleanup_client(client_id, state).await;
    send_task.await.ok();
}

async fn cleanup_client(client_id: u32, state: &'static AppState) {
    let (room_id, game_id) = state
        .client_state_map
        .get(&client_id)
        .map(|cs| (cs.room_id, cs.game_id))
        .unwrap_or((None, None));

    if let Some(rid) = room_id {
        state.send_to_room(rid, RoomCommand::PlayerLeave { client_id });
    } else if let Some(gid) = game_id {
        state.send_to_game(gid, GameCommand::PlayerDisconnected(client_id));
    } else {
        // Client was still in the lobby.
        let _ = state.lobby_sender.send(LobbyCommand::ClientLeft(client_id));
    }

    state.client_sender_map.remove(&client_id);
    state.client_state_map.remove(&client_id);
}

async fn handle_msg(
    client_id: u32,
    text: &str,
    state: &'static AppState,
) -> Result<(), serde_json::Error> {
    let raw: WsRawMessage = serde_json::from_str(text)?;
    match raw.msg_type.as_str() {
        "setName" => {
            let name: String = serde_json::from_value(raw.payload)?;
            if let Some(mut cs) = state.client_state_map.get_mut(&client_id) {
                cs.name = name;
            }
        }

        "createRoom" => {
            let name = state
                .client_state_map
                .get(&client_id)
                .map(|cs| cs.name.clone())
                .unwrap_or_default();
            let room_id = state.alloc_room_id();
            let (room_tx, room_rx) = mpsc::unbounded_channel::<RoomCommand>();
            state.room_sender_map.insert(room_id, room_tx);
            if let Some(mut cs) = state.client_state_map.get_mut(&client_id) {
                cs.room_id = Some(room_id);
            }
            let _ = state.lobby_sender.send(LobbyCommand::ClientLeft(client_id));
            tokio::spawn(crate::room::actor::run_room_actor(
                room_id, client_id, name, room_rx, state,
            ));
        }

        "joinRoom" => {
            let room_id: u32 = serde_json::from_value(raw.payload)?;
            let name = state
                .client_state_map
                .get(&client_id)
                .map(|cs| cs.name.clone())
                .unwrap_or_default();
            state.send_to_room(room_id, RoomCommand::PlayerJoin { client_id, client_name: name });
        }

        "leaveRoom" => {
            if let Some(rid) = state.client_state_map.get(&client_id).and_then(|cs| cs.room_id) {
                state.send_to_room(rid, RoomCommand::PlayerLeave { client_id });
            }
        }

        "toggleReady" => {
            if let Some(rid) = state.client_state_map.get(&client_id).and_then(|cs| cs.room_id) {
                state.send_to_room(rid, RoomCommand::ToggleReady { client_id });
            }
        }

        "changeMap" => {
            let map_id: u32 = serde_json::from_value(raw.payload)?;
            if let Some(rid) = state.client_state_map.get(&client_id).and_then(|cs| cs.room_id) {
                state.send_to_room(rid, RoomCommand::ChangeMap { map_id });
            }
        }

        "startGame" => {
            if let Some(rid) = state.client_state_map.get(&client_id).and_then(|cs| cs.room_id) {
                state.send_to_room(rid, RoomCommand::StartGame { host_client_id: client_id });
            }
        }

        "playerMove" => {
            let payload: PlayerMovePayload = serde_json::from_value(raw.payload)?;
            println!("{}",5);
            if let Some(gid) = state.client_state_map.get(&client_id).and_then(|cs| cs.game_id) {
                state.send_to_game(gid, GameCommand::PlayerMove(payload));
            }
        }

        "generateBomb" => {
            let payload: GenerateBombPayload = serde_json::from_value(raw.payload)?;
            if let Some(gid) = state.client_state_map.get(&client_id).and_then(|cs| cs.game_id) {
                state.send_to_game(gid, GameCommand::GenerateBomb(payload));
            }
        }

        "timeSyncPing" => {
            let payload: TimeSyncPingPayload = serde_json::from_value(raw.payload)?;
            if let Some(gid) = state.client_state_map.get(&client_id).and_then(|cs| cs.game_id) {
                state.send_to_game(gid, GameCommand::TimeSyncPing { client_id, sent_at: payload.sent_at });
            }
        }

        other => {
            info!("unknown message type '{}' from client {}", other, client_id);
        }
    }

    Ok(())
}

pub fn test_game_start(host_client_id: u32) {
    let global_state = get_global_state();
    let game_id = 1;
    let (game_tx, game_rx) = tokio::sync::mpsc::unbounded_channel::<GameCommand>();
    global_state.game_sender_map.insert(game_id, game_tx);

    let mut players: Vec<ClientDataForState> = Vec::new();
    players.push(ClientDataForState {
        id: host_client_id,
        name: "test".to_string(),
        is_host: true,
        is_ready: true,
        man_sprite_key: crate::game::types::ManSpriteKey::Man1,
    });
    tokio::spawn(run_game_actor(
        game_id,
        players,
        1,
        game_rx,
        global_state,
    ));
    // info!("room {} started game {}", room_id, game_id);
}
