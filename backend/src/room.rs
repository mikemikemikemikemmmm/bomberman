use serde::{Deserialize, Serialize};
use crate::game::GameState;
use crate::messages::ManSpriteKey;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RoomStatus {
    Waiting,
    Playing,
}

// ─── Wire types (sent to frontend) ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomSummary {
    pub id: u32,
    pub current_player_num: usize,
    pub status: RoomStatus,
    pub opened_second: u64,
    pub map_id: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomDetail {
    pub id: u32,
    pub players: Vec<PlayerInfo>,
    pub status: RoomStatus,
    pub opened_second: u64,
    pub map_id: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInfo {
    pub id: u32,
    pub name: String,
    pub is_ready: bool,
    pub is_host: bool,
    pub ping_level: PingLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PingLevel {
    #[serde(rename = "good")]
    Good,
    #[serde(rename = "mid")]
    Mid,
    #[serde(rename = "bad")]
    Bad,
}

// ─── Internal room state ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct RoomPlayer {
    pub id: u32,
    pub name: String,
    pub is_ready: bool,
    pub is_host: bool,
    pub man_key: ManSpriteKey,
    /// Grid position tracked server-side for collision/explosion checks
    pub grid_x: i32,
    pub grid_y: i32,
}

pub struct Room {
    pub id: u32,
    pub players: Vec<RoomPlayer>,
    pub status: RoomStatus,
    pub opened_at: std::time::Instant,
    pub map_id: u32,
    pub game: Option<GameState>,
}

impl Room {
    pub fn new(id: u32, host_id: u32, host_name: String) -> Self {
        let (sx, sy) = spawn_pos(0);
        Self {
            id,
            players: vec![RoomPlayer {
                id: host_id,
                name: host_name,
                is_ready: false,
                is_host: true,
                man_key: ManSpriteKey::Man1,
                grid_x: sx,
                grid_y: sy,
            }],
            status: RoomStatus::Waiting,
            opened_at: std::time::Instant::now(),
            map_id: 0,
            game: None,
        }
    }

    pub fn to_summary(&self) -> RoomSummary {
        RoomSummary {
            id: self.id,
            current_player_num: self.players.len(),
            status: self.status.clone(),
            opened_second: self.opened_at.elapsed().as_secs(),
            map_id: self.map_id,
        }
    }

    pub fn to_detail(&self) -> RoomDetail {
        RoomDetail {
            id: self.id,
            players: self.players.iter().map(|p| PlayerInfo {
                id: p.id,
                name: p.name.clone(),
                is_ready: p.is_ready,
                is_host: p.is_host,
                ping_level: PingLevel::Good,
            }).collect(),
            status: self.status.clone(),
            opened_second: self.opened_at.elapsed().as_secs(),
            map_id: self.map_id,
        }
    }

    /// Returns the assigned ManSpriteKey if the room has space, None otherwise.
    pub fn add_player(&mut self, user_id: u32, name: String) -> Option<ManSpriteKey> {
        if self.players.len() >= 4 || self.status == RoomStatus::Playing {
            return None;
        }
        let idx = self.players.len();
        let man_key = ManSpriteKey::from_index(idx);
        let (sx, sy) = spawn_pos(idx);
        self.players.push(RoomPlayer {
            id: user_id,
            name,
            is_ready: false,
            is_host: false,
            man_key: man_key.clone(),
            grid_x: sx,
            grid_y: sy,
        });
        Some(man_key)
    }

    pub fn remove_player(&mut self, user_id: u32) -> bool {
        let pos = match self.players.iter().position(|p| p.id == user_id) {
            Some(p) => p,
            None => return false,
        };
        self.players.remove(pos);
        // Re-assign host if needed
        if !self.players.is_empty() && !self.players.iter().any(|p| p.is_host) {
            self.players[0].is_host = true;
        }
        // Re-assign man keys and spawn positions to preserve ordering
        for (i, p) in self.players.iter_mut().enumerate() {
            p.man_key = ManSpriteKey::from_index(i);
            let (sx, sy) = spawn_pos(i);
            p.grid_x = sx;
            p.grid_y = sy;
        }
        true
    }

    pub fn toggle_ready(&mut self, user_id: u32) {
        if let Some(p) = self.players.iter_mut().find(|p| p.id == user_id) {
            p.is_ready = !p.is_ready;
        }
    }

    /// Game starts when there are ≥2 players and all are ready.
    pub fn all_ready(&self) -> bool {
        self.players.len() >= 2 && self.players.iter().all(|p| p.is_ready)
    }

    pub fn player_ids(&self) -> Vec<u32> {
        self.players.iter().map(|p| p.id).collect()
    }

    pub fn find_man_key(&self, user_id: u32) -> Option<ManSpriteKey> {
        self.players.iter().find(|p| p.id == user_id).map(|p| p.man_key.clone())
    }

    pub fn player_grid_positions(&self) -> Vec<(ManSpriteKey, i32, i32)> {
        self.players.iter().map(|p| (p.man_key.clone(), p.grid_x, p.grid_y)).collect()
    }

    pub fn update_player_grid(&mut self, user_id: u32, gx: i32, gy: i32) {
        if let Some(p) = self.players.iter_mut().find(|p| p.id == user_id) {
            p.grid_x = gx;
            p.grid_y = gy;
        }
    }

    pub fn player_man_keys(&self) -> Vec<ManSpriteKey> {
        self.players.iter().map(|p| p.man_key.clone()).collect()
    }
}

fn spawn_pos(idx: usize) -> (i32, i32) {
    match idx {
        0 => (1, 1),
        1 => (8, 1),
        2 => (1, 8),
        _ => (8, 8),
    }
}
