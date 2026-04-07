#![allow(warnings)]
mod game;
mod lobby;
mod room;
mod state;
mod ws;

use axum::{extract::WebSocketUpgrade, response::IntoResponse, routing::get, Router};
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Lobby actor must be running before any client connects.
    let (lobby_tx, lobby_rx) = mpsc::unbounded_channel();
    state::init_global_state(lobby_tx);
    let global_state = state::get_global_state();
    tokio::spawn(lobby::actor::run_lobby_actor(lobby_rx, global_state));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(ws_upgrade))
        .layer(cors);

    let addr = "localhost:8081";
    tracing::info!("Bomberman server listening on ws://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_upgrade(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|socket| ws::handler::handle_init_socket(socket))
}