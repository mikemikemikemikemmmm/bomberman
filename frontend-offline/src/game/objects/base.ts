import { HALF_TILE_WIDTH, TILE_WIDTH } from "../gameConfig";
import { SpriteKey } from "../sprite_animations/sprite";
import { MapIndex, ObjType, Position } from "../types";
import { tranPositionToIndex } from "../utils";
export class BaseObj {
    type: ObjType
    sprite: Phaser.GameObjects.Sprite
    constructor(scene: Phaser.Scene, index: MapIndex, spriteKey: SpriteKey, startFrame: number, type: ObjType) {
        this.sprite = scene.add.sprite(index.indexX * TILE_WIDTH, index.indexY * TILE_WIDTH, spriteKey, startFrame)
        this.sprite.setOrigin(0, 0)
        this.type = type
    }
    getObjType() {
        return this.type
    }
    getCenterMapIndex(): MapIndex {
        const centerPosition = {
            posY: this.sprite.y + HALF_TILE_WIDTH,
            posX: this.sprite.x + HALF_TILE_WIDTH
        }
        return tranPositionToIndex(centerPosition)
    }
    getPosition(): Position {
        return {
            posY: this.sprite.y,
            posX: this.sprite.x
        }
    }
    getMapIndex(): MapIndex {
        return {
            indexY: this.sprite.y / TILE_WIDTH,
            indexX: this.sprite.x / TILE_WIDTH
        }
    }
}
