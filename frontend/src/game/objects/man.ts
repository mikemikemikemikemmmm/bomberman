import { ManSpriteKey } from "../sprite";
import { ManDirection } from "../types";
import { BaseObj } from "./base";

export class ManObj extends BaseObj {
    // 自訂屬性
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    constructor(scene: Phaser.Scene, indexX: number, indexY: number, manSpriteKey: ManSpriteKey) {
        super(scene, indexX, indexY, manSpriteKey, 4);
        this.manSpriteKey = manSpriteKey
    }
    // 自訂方法
    moveTo(newX: number, newY: number) {
        const [x,y] = [this.sprite.x,this.sprite.y]
        this.sprite.setPosition(newX, newY);
    }
    setDir(dir: ManDirection) {
        this.dir = dir
        const animKey = `${this.manSpriteKey}_${dir}`
        this.sprite.play(animKey)
    }
    setIsMoving(bool: boolean) {
        this.isMoving = bool
        if (!bool) {
            this.sprite.anims.pause()
        } else {
            this.sprite.anims.resume()
        }
    }
}
