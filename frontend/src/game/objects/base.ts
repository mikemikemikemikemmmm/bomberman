import { HALF_TILE_WIDTH, TILE_WIDTH } from "../gameConfig";
import { SpriteKey } from "../sprite_animations/sprite";
import { MapIndex, ObjType } from "../types";
import { tranPositionToIndex } from "../utils";
export class BaseObj {
    type: ObjType
    sprite: Phaser.GameObjects.Sprite
    constructor(scene: Phaser.Scene, index: MapIndex, spriteKey: SpriteKey, startFrame: number, type: ObjType) {
        this.sprite = scene.add.sprite(index.x * TILE_WIDTH, index.y * TILE_WIDTH, spriteKey, startFrame)
        this.sprite.setOrigin(0, 0)
        this.type = type
    }
    getObjType() {
        return this.type
    }
    getCenterMapIndex() {
        const centerPosition = {
            y: this.sprite.y + HALF_TILE_WIDTH,
            x: this.sprite.x + HALF_TILE_WIDTH
        }
        return tranPositionToIndex(centerPosition)
    }
    getPosition() {
        return {
            y: this.sprite.y,
            x: this.sprite.x
        }
    }
}
