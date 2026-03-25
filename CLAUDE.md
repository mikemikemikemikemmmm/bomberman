# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based Bomberman clone using **Phaser 3** (frontend) and a **Go WebRTC signaling server** (backend). Players connect peer-to-peer via WebRTC DataChannels; the backend only handles signaling (offer/answer/ICE candidate exchange).

## Commands

### Frontend (`frontend/`)
```bash
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:8080
npm run dev-nolog    # Dev server without telemetry
npm run build        # Production build to /dist
```

### Backend (`backend/`)
```bash
go run main.go       # Start signaling server on ws://localhost:8081/signal
go build             # Build executable
```

Both must run simultaneously for the full stack. The frontend connects to the backend via `VITE_WS_URL` defined in `frontend/.env.development`.

## Architecture

### Frontend Scene Flow
Scenes are loaded in order: **Boot → Preloader → MainMenu**, then custom game scenes: **Lobby → Room → Playing**.

- `scenes/Boot.ts` / `Preloader.ts` / `MainMenu.ts` — Phaser template scenes (kept for asset loading demo)
- `scenes/lobby.ts` — Loads sprites and registers animations; entry point for actual game flow
- `scenes/room.ts` / `playing.ts` — Game lobby and active gameplay (skeleton)

The game is initialized in `main.ts` (not `game.ts` — `game.ts` is an unused alternative config).

### Game Configuration
- `config.ts` — Central constants: `TILE_WIDTH = 64px`, grid is `21×21 = 1344×1344px`
- `animations.ts` — All Phaser animation definitions (players, explosions, items) centralized here; called once during scene initialization

### Game Object Hierarchy
All game objects extend `BaseObject` (`object/base.ts`), which wraps a Phaser sprite. Concrete classes: `Player`, `Bomb`, `Brick`, `Item`, `Wall`. `ObjectManager` (`object/manager.ts`) owns and updates all active objects.

### WebRTC Layer
- `api/webrtc.ts` — Complete `WebRTCClient` implementation; instantiated in `main.ts` and passed to scenes
- Signal protocol: JSON messages with `type: "offer" | "answer" | "candidate"`, plus optional `sdp` and `candidate` fields
- ICE server: `stun:stun.l.google.com:19302`

### Backend (Go)
`backend/main.go` is a single-file server using **Pion WebRTC v3** and **Gorilla WebSocket**. It handles one `/signal` WebSocket endpoint, creates a `PeerConnection` per client, and relays ICE candidates.

## Development State

Most game object classes (`Bomb`, `Brick`, `Item`, `Wall`, `InputManager`, `MapManager`) are stubs — method signatures exist but bodies are unimplemented. The WebRTC signaling path is fully functional.
