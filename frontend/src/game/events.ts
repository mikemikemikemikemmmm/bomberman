import { ManDirection } from "./types"
import type { ManSpriteKey } from "./sprite"
export type ItemType = "fire" | "speed" | "moreBomb"

export interface PlayerMoveEvent {
    type: "playerMove"
    payload: {
        manKey: ManSpriteKey
        x: number
        y: number
        dir: ManDirection
        isMoving: boolean
    }
}

export interface CreateBombEvent {
    type: "createBomb"
    payload: {
        manKey: ManSpriteKey
        x: number
        y: number
        bombPower: number
    }
}

export interface BombExplode {
    type: "bombExplode"
    payload: {
        x: number
        y: number
        cells: { x: number; y: number }[]
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

export interface ItemEaten {
    type: "itemEaten"
    payload: {
        manKey: ManSpriteKey
        x: number
        y: number
        itemType: ItemType
    }
}

export interface PlayerDie {
    type: "playerDie"
    payload: {
        manKey: ManSpriteKey
    }
}

export type GameEvent =
    | PlayerMoveEvent
    | CreateBombEvent
    | BombExplode
    | CreateItem
    | ItemEaten
    | PlayerDie
