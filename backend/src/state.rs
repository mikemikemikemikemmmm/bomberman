use axum::extract::ws::Message;
use dashmap::DashMap;
use serde::Serialize;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::OnceLock;
use tokio::sync::mpsc::UnboundedSender;

use crate::game::command::GameCommand;
use crate::lobby::command::LobbyCommand;
use crate::room::command::RoomCommand;

/// Shared room summary sent to lobby clients.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomListItem {
    pub id: u32,
    pub current_player_num: usize,
    pub opened_second: u64,
    pub map_id: u32,
}

/// Per-client mutable state stored in AppState.
pub struct ClientState {
    pub id: u32,
    pub name: String,
    pub room_id: Option<u32>,
    pub game_id: Option<u32>,
}

pub struct AppState {
    /// WS send channel for each connected client.
    pub client_sender_map: DashMap<u32, UnboundedSender<Message>>,
    /// Mutable state for each connected client.
    pub client_state_map: DashMap<u32, ClientState>,
    /// Command channel for each active room actor.
    pub room_sender_map: DashMap<u32, UnboundedSender<RoomCommand>>,
    /// Snapshot of every open room; updated by room actors, read by lobby actor.
    pub room_list_cache: DashMap<u32, RoomListItem>,
    /// Command channel for each active game actor.
    pub game_sender_map: DashMap<u32, UnboundedSender<GameCommand>>,
    /// Command channel for the singleton lobby actor.
    pub lobby_sender: UnboundedSender<LobbyCommand>,

    next_client_id: AtomicU32,
    next_room_id: AtomicU32,
    next_game_id: AtomicU32,
}

static GLOBAL_STATE: OnceLock<AppState> = OnceLock::new();

/// Must be called once from main before the server starts.
pub fn init_global_state(lobby_sender: UnboundedSender<LobbyCommand>) {
    GLOBAL_STATE.get_or_init(|| AppState::new(lobby_sender));
}

pub fn get_global_state() -> &'static AppState {
    GLOBAL_STATE.get().expect("global state not initialized")
}

impl AppState {
    fn new(lobby_sender: UnboundedSender<LobbyCommand>) -> Self {
        Self {
            client_sender_map: DashMap::new(),
            client_state_map: DashMap::new(),
            room_sender_map: DashMap::new(),
            room_list_cache: DashMap::new(),
            game_sender_map: DashMap::new(),
            lobby_sender,
            next_client_id: AtomicU32::new(1),
            next_room_id: AtomicU32::new(1),
            next_game_id: AtomicU32::new(1),
        }
    }

    pub fn alloc_client_id(&self) -> u32 {
        self.next_client_id.fetch_add(1, Ordering::Relaxed)
    }

    pub fn alloc_room_id(&self) -> u32 {
        self.next_room_id.fetch_add(1, Ordering::Relaxed)
    }

    pub fn alloc_game_id(&self) -> u32 {
        self.next_game_id.fetch_add(1, Ordering::Relaxed)
    }
    pub fn send_to_game(&self,game_id: u32, payload: GameCommand) {
        if let Some(sender) = self.game_sender_map.get(&game_id) {
            let _ = sender.send(payload);
        }
    }

    pub fn send_to_client(&self,client_id: u32, payload: Message) {
        if let Some(sender) = self.client_sender_map.get(&client_id) {
            let _ = sender.send(payload);
        }
    }

    pub fn send_to_room(&self,room_id: u32, payload: RoomCommand) {
        if let Some(sender) = self.room_sender_map.get(&room_id) {
            let _ = sender.send(payload);
        }
    }
}
