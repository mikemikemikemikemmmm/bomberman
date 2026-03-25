import { HALF_TILE_WIDTH, TILE_WIDTH } from "../gameConfig";
import { SpriteKey } from "../sprite";
import { tranPositionToIndex } from "../utils";

export class BaseObj {
    sprite: Phaser.GameObjects.Sprite
    constructor(scene: Phaser.Scene, indexX: number, indexY: number, spriteKey: SpriteKey, startFrame: number) {
        this.sprite = scene.add.sprite(indexX * TILE_WIDTH, indexY * TILE_WIDTH, spriteKey, startFrame)
        this.sprite.setOrigin(0, 0)
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
