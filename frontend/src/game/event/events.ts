import { ManDirection } from "../types"
import type { ManSpriteKey } from "../sprite_animations/sprite"
export type ItemType = "fire" | "speed" | "moreBomb"
export interface PlayerMoveEventPayload {
    manKey: ManSpriteKey
    newX: number
    newY: number
    dir: ManDirection
    isMoving: boolean
}
export interface PlayerMoveEvent {
    type: "playerMove"
    payload: PlayerMoveEventPayload
}

export interface GenerateBombEvent {
    type: "generateBomb"
    payload: {
        x: number
        y: number
        bombPower: number
        manSpriteKey: ManSpriteKey
    }
}

export interface BombExplode {
    type: "bombExplode"
    payload: {
        x: number
        y: number
        cells: { x: number; y: number }[]
        brickCells?: { x: number; y: number }[]
    }
}

export interface CreateItem {
    type: "createItem"
    payload: {
        x: number
        y: number
        itemType: ItemType
    }
}

export interface RemoveItem {
    type: "removeItem"
    payload: {
        x: number
        y: number
    }
}

export interface PlayerDie {
    type: "playerDie"
    payload: {
        manKey: ManSpriteKey
    }[]
}
export interface RemoveFire {
    type: "removeFire"
    payload: {
        x: number
        y: number
    }
}
export interface GameOver {
    type: "gameOver"
}
export interface PlayerGetItemEvent {
    type: "playerGetItem"
    payload: {
        x: number
        y: number
        manKey: ManSpriteKey
        itemType: ItemType
    }
}
export type GameStateChangeEvent =
    | PlayerMoveEvent
    | GenerateBombEvent
    | BombExplode
    | CreateItem
    | RemoveItem
    | RemoveFire
    | PlayerDie
    | GameOver
    | PlayerGetItemEvent
