import { PlayerMoveEventPayload } from "../event/events";
import { ManSpriteKey } from "../sprite_animations/sprite";
import { ManDirection, MapIndex, Position } from "../types";
import { BaseObj } from "./base";
import { BombObj } from "./bomb";

export class ManObj extends BaseObj {
    // 自訂屬性
    userId?: number
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    speed = 1
    bombNum = 1
    bombPower = 1
    canPassBombPosList: Position[] = [ ]
    constructor(scene: Phaser.Scene, index: MapIndex, manSpriteKey: ManSpriteKey, userId: number) {
        super(scene, index, manSpriteKey, 5, "man");
        this.manSpriteKey = manSpriteKey
        this.sprite.setZ(9)
        if (userId) {
            this.userId = userId
        }
    }
}
