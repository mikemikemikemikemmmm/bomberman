import type { ManSpriteKey } from "../game/sprite_animations/sprite"
import type { ManDirection } from "../game/types"

// ─── Shapes that match backend4 wire format ──────────────────────────────────

export interface RoomListItem {
    id: number
    currentPlayerNum: number
    openedSecond: number
    mapId: number
}

export interface RoomStatePlayer {
    clientId: number
    clientName: string
    isReady: boolean
    isHost: boolean
    manSpriteKey: ManSpriteKey
}

export interface PlayerMovePayload {
    manKey: ManSpriteKey
    newX: number
    newY: number
    dir: ManDirection
    isMoving: boolean
    userId: number
}

export interface GenerateBombPayload {
    manKey: ManSpriteKey
    x: number
    y: number
    bombPower: number
}

// ─── Event maps ──────────────────────────────────────────────────────────────

export type UIEventMap = {
    // receive
    roomList: RoomListItem[]
    roomState: RoomStatePlayer[]
    gameStarted: { gameId: number; gameEndTime: number }
    error: { msg: string }
    // send
    setName: string
    createRoom: null
    joinRoom: number
    leaveRoom: null
    toggleReady: null
    changeMap: number
    startGame: null
}

export type GameEventMap = {
    playerMove: PlayerMovePayload
    generateBomb: GenerateBombPayload
    timeSyncPing: { sentAt: number; from: string }
    timeSyncPong: { sentAt: number; to: string }
}

export type InitEventMap = {
    connected: { userId: number }
    disconnected: void
    errorWhenConnect: void
}

export type WsEventMap = UIEventMap & GameEventMap & InitEventMap
