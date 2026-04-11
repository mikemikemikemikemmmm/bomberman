import { useGlobalStore } from "../../store";
import { BASE_MAN_SPEED, START_BOMB_NUM, START_BOMB_POWER, START_SPEED } from "../gameConfig";
import { ManSpriteKey } from "../sprite_animations/sprite";
import { ManDirection, MapIndex, Position } from "../types";
import { BaseObj } from "./base";
import { ItemType } from "../event/events";
import { ANIMS } from "../sprite_animations/animations";

const MAX_SPEED = 12
const MAX_BOMB_NUM = 6
const MAX_BOMB_POWER = 6

export class ManObj extends BaseObj {
    // 自訂屬性
    userId: number
    isAlive = true
    isSelf: boolean = true
    manSpriteKey: ManSpriteKey
    dir: ManDirection = "down"
    isMoving: boolean = false
    usedBombNum: number = 0
    speed = START_SPEED
    bombNum = START_BOMB_NUM
    bombPower = START_BOMB_POWER    
    
    canPassBombPosList: Position[] = []
    constructor(scene: Phaser.Scene, index: MapIndex, manSpriteKey: ManSpriteKey, userId: number) {
        super(scene, index, manSpriteKey, 5, "man");
        this.manSpriteKey = manSpriteKey
        this.sprite.setDepth(9)
        this.userId = userId
        const selfUserId = useGlobalStore.getState().userId
        console.log(selfUserId, userId, 123)
        if (selfUserId === userId) {
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
    eatItem(itemType: ItemType) {
        if (itemType === "speed") this.speed = Math.min(MAX_SPEED, this.speed + 1)
        else if (itemType === "moreBomb") this.bombNum = Math.min(MAX_BOMB_NUM, this.bombNum + 1)
        else if (itemType === "fire") this.bombPower = Math.min(MAX_BOMB_POWER, this.bombPower + 1)
    }
    die() {
        this.isAlive = false
        const anim = ANIMS[this.manSpriteKey].die
        this.sprite.once(
            Phaser.Animations.Events.ANIMATION_COMPLETE_KEY +anim,
            () => {
                console.log("die complete")
                this.sprite.destroy()
            }
        )
        this.sprite.anims.play(anim)
    }
}
