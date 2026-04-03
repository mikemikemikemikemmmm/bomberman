use std::collections::HashSet;

use axum::extract::ws::Message;
use tokio::sync::mpsc::UnboundedReceiver;

use crate::state::AppState;
use crate::ws::message::make_ws_msg_room_list;

use super::command::LobbyCommand;

/// Singleton task that owns the set of lobby client IDs and handles broadcasts.
pub async fn run_lobby_actor(mut rx: UnboundedReceiver<LobbyCommand>, state: &'static AppState) {
    let mut lobby_clients: HashSet<u32> = HashSet::new();

    while let Some(cmd) = rx.recv().await {
        match cmd {
            LobbyCommand::ClientJoined(id) => {
                lobby_clients.insert(id);
                // Send the current room list to the newly arrived client.
                send_room_list_to(std::slice::from_ref(&id), state);
            }
            LobbyCommand::ClientLeft(id) => {
                lobby_clients.remove(&id);
            }
            LobbyCommand::BroadcastRoomList => {
                let ids: Vec<u32> = lobby_clients.iter().copied().collect();
                send_room_list_to(&ids, state);
            }
        }
    }
}

fn send_room_list_to(client_ids: &[u32], state: &AppState) {
    let room_list: Vec<_> = state.room_list_cache.iter().map(|r| r.value().clone()).collect();
    let msg = Message::Text(make_ws_msg_room_list(&room_list).into());
    for &id in client_ids {
        state.send_to_client(id, msg.clone());
    }
}
