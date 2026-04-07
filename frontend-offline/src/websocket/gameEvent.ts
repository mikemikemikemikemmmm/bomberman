import { ItemType } from "../game/event/events"
import { ManSpriteKey } from "../game/sprite_animations/sprite"
import { ManDirection } from "../game/types"

interface PlayMoveEvent {
    manSpriteKey: ManSpriteKey,
    dir: ManDirection,
    isMoving: boolean,
    posX: number,
    posY: number
}
interface CreateBombEvent {
    x: number,
    y: number,
    power: number
}
interface BombExplode {
    x: number,
    y: number
}
interface CreateItem {

    x: number,
    y: number,
    itemType: ItemType
}
interface RemoveItem {
    x: number,
    y: number
}
interface CreateFire {
    x: number,
    y: number
}
interface RemoveFire {
    x: number,
    y: number
}
interface DestroyBrick {
    x: number,
    y: number
}

type WsGameStateChangeEvent = PlayMoveEvent | CreateBombEvent | BombExplode | CreateItem | RemoveItem | CreateFire | RemoveFire | DestroyBrick