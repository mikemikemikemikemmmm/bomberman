import { useGlobalStore } from "../../store";
import { BASE_MAN_SPEED } from "../gameConfig";
import { ManSpriteKey } from "../sprite_animations/sprite";
import { ManDirection, MapIndex, Position } from "../types";
import { BaseObj } from "./base";

export class ManObj extends BaseObj {
    // 自訂屬性
    isSelf: boolean = false
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    usedBombNum: number = 0
    speed = BASE_MAN_SPEED
    bombNum = 10
    bombPower = 2
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
