use serde::Serialize;

use crate::game::types::ManSpriteKey;
use crate::state::RoomListItem;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientDataForRoomClient {
    pub client_id: u32,
    pub client_name: String,
    pub is_ready: bool,
    pub is_host: bool,
    pub man_sprite_key: ManSpriteKey,
}

pub struct ClientDataForState {
    pub id: u32,
    pub name: String,
    pub is_ready: bool,
    pub is_host: bool,
    pub man_sprite_key: ManSpriteKey,
}

pub struct RoomState {
    pub id: u32,
    pub players: Vec<ClientDataForState>,
    pub opened_at: std::time::Instant,
    pub map_id: u32,
}

impl RoomState {
    pub fn new(id: u32, host_id: u32, host_name: String) -> Self {
        Self {
            id,
            players: vec![ClientDataForState {
                id: host_id,
                name: host_name,
                is_ready: false,
                is_host: true,
                man_sprite_key: ManSpriteKey::Man1,
            }],
            opened_at: std::time::Instant::now(),
            map_id: 1,
        }
    }

    pub fn to_list_item(&self) -> RoomListItem {
        RoomListItem {
            id: self.id,
            current_player_num: self.players.len(),
            opened_second: self.opened_at.elapsed().as_secs(),
            map_id: self.map_id,
        }
    }

    /// Snapshot of players for sending to clients.
    pub fn to_client_data(&self) -> Vec<ClientDataForRoomClient> {
        self.players
            .iter()
            .map(|p| ClientDataForRoomClient {
                client_id: p.id,
                client_name: p.name.clone(),
                is_ready: p.is_ready,
                is_host: p.is_host,
                man_sprite_key: p.man_sprite_key.clone(),
            })
            .collect()
    }
}
