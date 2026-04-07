import type { RoomSummary, RoomPlayer } from '../ui/types'
import type { ManSpriteKey } from '../game/sprite_animations/sprite'
import type { ManDirection } from '../game/types'
import type { ItemType } from '../game/event/events'
import { GameMetaData } from '../store'

interface PlayerMovePayload {
  manKey: ManSpriteKey
  newX: number
  newY: number
  dir: ManDirection
  isMoving: boolean
  userId: number
}

interface GenerateBombPayload {
  manKey: ManSpriteKey
  x: number
  y: number
  bombPower: number
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
  playerMove: PlayerMovePayload
  generateBomb: GenerateBombPayload
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
