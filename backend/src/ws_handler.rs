use std::sync::Arc;
use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{mpsc, Mutex};
use tracing::{error, info, warn};

use crate::{
    game::{now_ms, GameState, TILE_SIZE},
    messages::*,
    room::{Room, RoomStatus},
    state::AppState,
};

// ─── Connection entry point ───────────────────────────────────────────────────

pub async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let user_id = state.alloc_user_id();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    state.clients.insert(user_id, tx);
    state.user_names.insert(user_id, format!("Player{}", user_id));

    info!("User {} connected", user_id);

    // Send `connected` event immediately
    state.send_to(user_id, &make_msg("connected", &ConnectedPayload { user_id }));

    // Send current rooms list
    let rooms = rooms_list(&state).await;
    state.send_to(user_id, &make_msg("getRoomsList", &rooms));

    let (mut ws_tx, mut ws_rx) = socket.split();

    // Forward queued messages → WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_tx.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Receive loop
    while let Some(result) = ws_rx.next().await {
        match result {
            Ok(Message::Text(text)) => {
                if let Err(e) = handle_message(user_id, &text, &state).await {
                    error!("User {}: message error: {}", user_id, e);
                }
            }
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {}
        }
    }

    info!("User {} disconnected", user_id);
    send_task.abort();
    cleanup_user(user_id, &state).await;
}

// ─── Message dispatch ─────────────────────────────────────────────────────────

async fn handle_message(
    user_id: u32,
    text: &str,
    state: &Arc<AppState>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let raw: RawMessage = serde_json::from_str(text)?;

    match raw.msg_type.as_str() {
        "changeUserName" => {
            let name: String = serde_json::from_value(raw.payload)?;
            state.user_names.insert(user_id, name);
            if let Some(rid) = room_of(user_id, state) {
                broadcast_room_detail(rid, state).await;
            }
        }
        "createRoom" => on_create_room(user_id, state).await,
        "joinRoom" => {
            let room_id: u32 = serde_json::from_value(raw.payload)?;
            on_join_room(user_id, room_id, state).await;
        }
        "leaveRoom" => on_leave_room(user_id, state).await,
        "changeReadyStatus" => on_change_ready(user_id, state).await,
        "changeMap" => {
            let map_id: u32 = serde_json::from_value(raw.payload)?;
            on_change_map(user_id, map_id, state).await;
        }
        "playerMove" => {
            let payload: PlayerMovePayload = serde_json::from_value(raw.payload)?;
            on_player_move(user_id, payload, state).await;
        }
        "generateBomb" => {
            let payload: GenerateBombPayload = serde_json::from_value(raw.payload)?;
            on_generate_bomb(user_id, payload, state).await;
        }
        "timeSyncPing" => {
            let ping: TimeSyncPingPayload = serde_json::from_value(raw.payload)?;
            state.send_to(
                user_id,
                &make_msg("timeSyncPong", &TimeSyncPongPayload {
                    sent_at: ping.sent_at,
                    to: ping.from,
                }),
            );
        }
        other => warn!("Unknown message type from user {}: {}", user_id, other),
    }

    Ok(())
}

// ─── Room handlers ────────────────────────────────────────────────────────────

async fn on_create_room(user_id: u32, state: &Arc<AppState>) {
    on_leave_room(user_id, state).await;

    let room_id = state.alloc_room_id();
    let name = state.user_name(user_id);
    let room = Room::new(room_id, user_id, name);
    let detail = room.to_detail();
    state.rooms.insert(room_id, Arc::new(Mutex::new(room)));
    state.user_rooms.insert(user_id, room_id);

    let resp = serde_json::json!({ "success": true, "data": detail });
    state.send_to(user_id, &make_msg("createRoomResponse", &resp));
    state.send_to(user_id, &make_msg("getJoinedRoomData", &detail));

    broadcast_rooms_to_all(state).await;
}

async fn on_join_room(user_id: u32, room_id: u32, state: &Arc<AppState>) {
    on_leave_room(user_id, state).await;

    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let name = state.user_name(user_id);
    let (joined, detail, ids) = {
        let mut room = room_arc.lock().await;
        let joined = room.add_player(user_id, name).is_some();
        let detail = room.to_detail();
        let ids = room.player_ids();
        (joined, detail, ids)
    };

    if joined {
        state.user_rooms.insert(user_id, room_id);
        state.send_to(user_id, &make_msg("getJoinedRoomData", &detail));
        // Notify all others in the room of the new roster
        for pid in &ids {
            if *pid != user_id {
                state.send_to(*pid, &make_msg("getJoinedRoomData", &detail));
            }
        }
        broadcast_rooms_to_all(state).await;
    }
}

async fn on_leave_room(user_id: u32, state: &Arc<AppState>) {
    let room_id = match state.user_rooms.remove(&user_id).map(|(_, id)| id) {
        Some(id) => id,
        None => return,
    };

    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let (empty, detail, remaining_ids) = {
        let mut room = room_arc.lock().await;
        room.remove_player(user_id);
        let empty = room.players.is_empty();
        let detail = room.to_detail();
        let ids = room.player_ids();
        (empty, detail, ids)
    };

    if empty {
        state.rooms.remove(&room_id);
    } else {
        let msg = make_msg("getJoinedRoomData", &detail);
        state.send_to_many(&remaining_ids, &msg);
    }

    state.send_to(user_id, &make_msg("leaveRoomResponse", &true));
    broadcast_rooms_to_all(state).await;
}

async fn on_change_ready(user_id: u32, state: &Arc<AppState>) {
    let room_id = match room_of(user_id, state) {
        Some(id) => id,
        None => return,
    };
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let (all_ready, detail, ids) = {
        let mut room = room_arc.lock().await;
        room.toggle_ready(user_id);
        let all_ready = room.all_ready();
        (all_ready, room.to_detail(), room.player_ids())
    };

    let msg = make_msg("getJoinedRoomData", &detail);
    state.send_to_many(&ids, &msg);

    if all_ready {
        start_game(room_id, state).await;
    }
}

async fn on_change_map(user_id: u32, map_id: u32, state: &Arc<AppState>) {
    let room_id = match room_of(user_id, state) {
        Some(id) => id,
        None => return,
    };
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let (detail, ids) = {
        let mut room = room_arc.lock().await;
        let is_host = room.players.iter()
            .find(|p| p.id == user_id)
            .map(|p| p.is_host)
            .unwrap_or(false);
        if is_host {
            room.map_id = map_id;
        }
        (room.to_detail(), room.player_ids())
    };

    let msg = make_msg("getJoinedRoomData", &detail);
    state.send_to_many(&ids, &msg);
}

// ─── Game handlers ────────────────────────────────────────────────────────────

async fn on_player_move(user_id: u32, payload: PlayerMovePayload, state: &Arc<AppState>) {
    let room_id = match room_of(user_id, state) {
        Some(id) => id,
        None => return,
    };
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let ids = {
        let mut room = room_arc.lock().await;
        // Track grid position server-side for explosion checks
        let gx = (payload.new_x / TILE_SIZE).floor() as i32;
        let gy = (payload.new_y / TILE_SIZE).floor() as i32;
        room.update_player_grid(user_id, gx, gy);
        room.player_ids()
    };

    // Broadcast to everyone except the sender (they applied optimistic update)
    let msg = make_msg("playerMove", &payload);
    for pid in &ids {
        if *pid != user_id {
            state.send_to(*pid, &msg);
        }
    }
}

async fn on_generate_bomb(user_id: u32, payload: GenerateBombPayload, state: &Arc<AppState>) {
    let room_id = match room_of(user_id, state) {
        Some(id) => id,
        None => return,
    };
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    // Validate player is in game
    {
        let room = room_arc.lock().await;
        if room.game.is_none() {
            return;
        }
    }

    // Broadcast bomb placement to all players
    let ids = {
        let room = room_arc.lock().await;
        room.player_ids()
    };
    let bx = payload.x;
    let by = payload.y;
    let power = payload.bomb_power;
    state.send_to_many(&ids, &make_msg("generateBomb", &payload));

    // Schedule explosion after fuse duration
    let state_clone = Arc::clone(state);
    let room_arc_clone = room_arc.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(crate::game::BOMB_FUSE_SECS)).await;
        detonate(room_id, bx, by, power, &room_arc_clone, &state_clone).await;
    });
}

/// Handles bomb detonation: calculates explosion, destroys bricks, drops items, kills players.
async fn detonate(
    room_id: u32,
    bx: i32,
    by: i32,
    power: u32,
    room_arc: &Arc<Mutex<Room>>,
    state: &Arc<AppState>,
) {
    let mut room = room_arc.lock().await;
    let game = match room.game.as_mut() {
        Some(g) => g,
        None => return,
    };

    // Collect positions before mutably borrowing game
    let positions = room.player_grid_positions();
    // Dropping the borrow of room.players by collecting into owned Vec.
    // Now we can mutably borrow game (a different field).
    let result = game.explode(bx, by, power, &positions);

    let ids = room.player_ids();

    // Build messages while still holding lock
    let explode_msg = make_msg("bombExplode", &BombExplodePayload {
        x: bx,
        y: by,
        cells: result.cells,
    });

    let mut item_msgs: Vec<String> = result.dropped_items.iter().map(|(ix, iy, itype)| {
        make_msg("createItem", &CreateItemPayload {
            x: *ix,
            y: *iy,
            item_type: itype.clone(),
        })
    }).collect();

    let die_msgs: Vec<String> = result.hit_player_keys.iter().map(|key| {
        make_msg("playerDie", &PlayerDiePayload { man_key: key.clone() })
    }).collect();

    drop(room); // release lock before sending

    state.send_to_many(&ids, &explode_msg);
    for msg in &item_msgs {
        state.send_to_many(&ids, msg);
    }
    for msg in &die_msgs {
        state.send_to_many(&ids, msg);
    }

    // Check game-over (0 or 1 survivor)
    check_game_over(room_id, room_arc, state, &ids).await;
}

async fn check_game_over(
    room_id: u32,
    room_arc: &Arc<Mutex<Room>>,
    state: &Arc<AppState>,
    ids: &[u32],
) {
    let alive = {
        let room = room_arc.lock().await;
        room.game.as_ref().map(|g| g.alive_players.len()).unwrap_or(0)
    };

    if alive <= 1 {
        // Reset room to waiting state
        let mut room = room_arc.lock().await;
        room.status = RoomStatus::Waiting;
        room.game = None;
        for p in room.players.iter_mut() {
            p.is_ready = false;
        }
        let detail = room.to_detail();
        drop(room);

        // Notify players that game ended — reuse getJoinedRoomData to sync state
        state.send_to_many(ids, &make_msg("getJoinedRoomData", &detail));
        broadcast_rooms_to_all(state).await;
    }
}

// ─── Game start ───────────────────────────────────────────────────────────────

async fn start_game(room_id: u32, state: &Arc<AppState>) {
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };

    let (ids, game_end_time) = {
        let mut room = room_arc.lock().await;
        room.status = RoomStatus::Playing;
        let keys = room.player_man_keys();
        let gs = GameState::new(&keys);
        let game_end_time = gs.game_end_time;
        room.game = Some(gs);
        (room.player_ids(), game_end_time)
    };

    let start_msg = make_msg_null("startPlaying");
    let sync_msg = make_msg("timeSyncBroadcast", &TimeSyncBroadcastPayload {
        game_end_time,
        sent_at: now_ms(),
    });

    for pid in &ids {
        state.send_to(*pid, &start_msg);
        state.send_to(*pid, &sync_msg);
    }

    broadcast_rooms_to_all(state).await;
}

// ─── Disconnect cleanup ───────────────────────────────────────────────────────

async fn cleanup_user(user_id: u32, state: &Arc<AppState>) {
    state.clients.remove(&user_id);
    state.user_names.remove(&user_id);
    on_leave_room(user_id, state).await;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn room_of(user_id: u32, state: &AppState) -> Option<u32> {
    state.user_rooms.get(&user_id).map(|r| *r)
}

async fn rooms_list(state: &Arc<AppState>) -> Vec<crate::room::RoomSummary> {
    // Collect Arc refs first to avoid holding DashMap shard lock while awaiting Mutex
    let arcs: Vec<Arc<Mutex<Room>>> = state.rooms.iter()
        .map(|e| e.value().clone())
        .collect();
    let mut out = Vec::with_capacity(arcs.len());
    for arc in arcs {
        out.push(arc.lock().await.to_summary());
    }
    out
}

async fn broadcast_rooms_to_all(state: &Arc<AppState>) {
    let list = rooms_list(state).await;
    state.broadcast_all(&make_msg("getRoomsList", &list));
}

async fn broadcast_room_detail(room_id: u32, state: &Arc<AppState>) {
    let room_arc = match state.rooms.get(&room_id) {
        Some(r) => r.clone(),
        None => return,
    };
    let (detail, ids) = {
        let room = room_arc.lock().await;
        (room.to_detail(), room.player_ids())
    };
    state.send_to_many(&ids, &make_msg("getJoinedRoomData", &detail));
}
