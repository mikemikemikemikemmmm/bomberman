import { useGlobalStore } from "../../store";
import { PlayerMoveEventPayload } from "../event/events";
import { ManSpriteKey } from "../sprite_animations/sprite";
import { ManDirection, MapIndex, Position } from "../types";
import { BaseObj } from "./base";
import { BombObj } from "./bomb";

export class ManObj extends BaseObj {
    // 自訂屬性
    isSelf: boolean = false
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    speed = 1
    bombNum = 10
    bombPower = 1
    canPassBombPosList: Position[] = []
    constructor(scene: Phaser.Scene, index: MapIndex, manSpriteKey: ManSpriteKey, userId: number) {
        super(scene, index, manSpriteKey, 5, "man");
        this.manSpriteKey = manSpriteKey
        this.sprite.setDepth(9)
        const _userId = useGlobalStore.getState().userId
        if (_userId === userId) {
            this.isSelf = true
        }
    }
    setDir(dir: ManDirection) {
        const animKey = `${this.manSpriteKey}_${dir}`
        this.sprite.anims.play(animKey, true)
        this.dir = dir
    }
    setMoving(v: boolean) {
        this.isMoving = v
        if (!v) {
            this.sprite.anims.pause()
        } else {
            this.sprite.anims.resume()
        }
    }
}
