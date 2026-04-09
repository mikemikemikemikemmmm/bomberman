import { useGlobalStore } from "../../store";
import { BASE_MAN_SPEED } from "../gameConfig";
import { ManSpriteKey } from "../sprite_animations/sprite";
import { ManDirection, MapIndex, Position } from "../types";
import { BaseObj } from "./base";
import { ItemType } from "./item";
const MAX_SPEED = 12
const MAX_BOMB_NUM = 6
const MAX_BOMB_POWER = 6
export class ManObj extends BaseObj {
    // 自訂屬性
    isAlive: boolean = true
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    usedBombNum: number = 0
    speed = BASE_MAN_SPEED
    bombNum = 2
    bombPower = 2
    canPassBombPosList: Position[] = []
    constructor(scene: Phaser.Scene, index: MapIndex, manSpriteKey: ManSpriteKey, userId: number) {
        super(scene, index, manSpriteKey, 5, "man");
        this.manSpriteKey = manSpriteKey
        this.sprite.setDepth(9)
    }
    setDir(dir: ManDirection) {
        if (!this.isAlive) {
            return
        }
        const animKey = `${this.manSpriteKey}_${dir}`
        this.sprite.anims.play(animKey, true)
        this.dir = dir
    }
    setMoving(v: boolean) {
        if (!this.isAlive) {
            return
        }
        this.isMoving = v
        if (!v) {
            this.sprite.anims.pause()
        } else {
            this.sprite.anims.resume()
        }
    }
    eatItem(itemType: ItemType) {

        if (itemType === 'speed') {
            this.speed = Math.min(MAX_SPEED, this.speed + 1)
        }
        else if (itemType === 'moreBomb') {
            this.bombNum = Math.min(MAX_BOMB_NUM, this.bombNum + 1)
        }
        else if (itemType === 'fire') {
            this.bombPower = Math.min(MAX_BOMB_POWER, this.bombPower + 1)
        }
    }
}
