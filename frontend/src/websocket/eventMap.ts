import type { RoomSummary, RoomPlayer } from '../ui/types'
import type { ManSpriteKey } from '../game/sprite_animations/sprite'
import type { ManDirection } from '../game/types'
import type { ItemType } from '../game/event/events'
import { GameMetaData } from '../store'

export interface SendSelfPlayerMovePayload {
  manKey: ManSpriteKey
  newX: number
  newY: number
  dir: ManDirection
  isMoving: boolean
  userId: number
}

export interface SendGenerateBombPayload {
  manKey: ManSpriteKey
  x: number
  y: number
  bombPower: number
  userId: number
}

interface GridPos { x: number; y: number }

export interface WsEventMap {
  // ── server → client ──────────────────────────────────────────────────────
  connected: { userId: number }
  roomList: RoomSummary[]
  roomState: { roomId: number; mapId: number; players: RoomPlayer[] }
  error: { msg: string }
  disconnected: undefined
  errorWhenConnect: undefined
  gameMetaData: GameMetaData
  playerMove: SendSelfPlayerMovePayload
  generateBomb: SendGenerateBombPayload
  bombExplode: { x: number; y: number; cells: GridPos[] }
  createItem: { x: number; y: number; itemType: ItemType }
  playerDie: { manKey: ManSpriteKey }
  itemEaten: { manKey: ManSpriteKey; x: number; y: number; itemType: ItemType }
  gameOver: { winnerKey: ManSpriteKey | null }
  gameStateChanged: any
  timeSyncPong: { sentAt: number; to: string }

  // ── client → server ──────────────────────────────────────────────────────
  setName: string
  createRoom: undefined
  joinRoom: number
  leaveRoom: undefined
  toggleReady: undefined
  changeMap: number
  startGame: undefined
  timeSyncPing: { sentAt: number; from: string }
}

export type UIEventMap = WsEventMap
