use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::{mpsc, Mutex};
use crate::room::Room;

pub type ClientSender = mpsc::UnboundedSender<String>;

pub struct AppState {
    next_user_id: AtomicU32,
    next_room_id: AtomicU32,
    pub rooms: DashMap<u32, Arc<Mutex<Room>>>,
    pub clients: DashMap<u32, ClientSender>,
    /// user_id → room_id
    pub user_rooms: DashMap<u32, u32>,
    /// user_id → display name
    pub user_names: DashMap<u32, String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            next_user_id: AtomicU32::new(1),
            next_room_id: AtomicU32::new(1),
            rooms: DashMap::new(),
            clients: DashMap::new(),
            user_rooms: DashMap::new(),
            user_names: DashMap::new(),
        }
    }

    pub fn alloc_user_id(&self) -> u32 {
        self.next_user_id.fetch_add(1, Ordering::Relaxed)
    }

    pub fn alloc_room_id(&self) -> u32 {
        self.next_room_id.fetch_add(1, Ordering::Relaxed)
    }

    pub fn send_to(&self, user_id: u32, msg: &str) {
        if let Some(tx) = self.clients.get(&user_id) {
            let _ = tx.send(msg.to_string());
        }
    }

    pub fn send_to_many(&self, ids: &[u32], msg: &str) {
        for id in ids {
            self.send_to(*id, msg);
        }
    }

    pub fn broadcast_all(&self, msg: &str) {
        for entry in self.clients.iter() {
            let _ = entry.value().send(msg.to_string());
        }
    }

    pub fn user_name(&self, user_id: u32) -> String {
        self.user_names
            .get(&user_id)
            .map(|n| n.clone())
            .unwrap_or_else(|| format!("Player{}", user_id))
    }
}
