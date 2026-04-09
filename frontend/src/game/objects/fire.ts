import { COUNTDOWN_MS, TILE_WIDTH } from "../gameConfig";
import { ANIMS } from "../sprite_animations/animations";
import { ObjType } from "../types";
export interface FireObjConfig {
    centerX: number,
    centerY: number,
    verticalStart: number,
    verticalEnd: number,
    horizontalStart: number,
    horizontalEnd: number

}
export class FireObj {
    type: ObjType = "fire"
    verticalSprites: Phaser.GameObjects.Sprite[]
    horizontalSprites: Phaser.GameObjects.Sprite[]
    centerSprite: Phaser.GameObjects.Sprite
    remainingMs: number = COUNTDOWN_MS.fire

    constructor(
        scene: Phaser.Scene,
        config: FireObjConfig
    ) {
        const { centerX, centerY, verticalEnd, verticalStart, horizontalEnd, horizontalStart } = config
        this.centerSprite = scene.add.sprite(centerX * TILE_WIDTH, centerY * TILE_WIDTH, 'explosion')
        this.centerSprite.setOrigin(0, 0)
        this.centerSprite.setDepth(2)
        this.centerSprite.anims.play(ANIMS.explosion.start)

        this.verticalSprites = []
        this.horizontalSprites = []

        // Up
        for (let i = 1; i <= verticalStart; i++) {
            const sprite = scene.add.sprite(centerX * TILE_WIDTH, (centerY - i) * TILE_WIDTH, 'explosion')
            sprite.setOrigin(0, 0)
            sprite.setDepth(2)

            sprite.anims.play(i === verticalStart ? ANIMS.explosion.up.end : ANIMS.explosion.up.middle)
            this.verticalSprites.push(sprite)
        }

        // Down
        for (let i = 1; i <= verticalEnd; i++) {
            const sprite = scene.add.sprite(centerX * TILE_WIDTH, (centerY + i) * TILE_WIDTH, 'explosion')
            sprite.setOrigin(0, 0)
            sprite.setDepth(2)
            sprite.anims.play(i === verticalEnd ? ANIMS.explosion.down.end : ANIMS.explosion.down.middle)
            this.verticalSprites.push(sprite)
        }

        // Left
        for (let i = 1; i <= horizontalStart; i++) {
            const sprite = scene.add.sprite((centerX - i) * TILE_WIDTH, centerY * TILE_WIDTH, 'explosion')
            sprite.setOrigin(0, 0)
            sprite.setDepth(2)
            sprite.anims.play(i === horizontalStart ? ANIMS.explosion.left.end : ANIMS.explosion.left.middle)
            this.horizontalSprites.push(sprite)
        }

        // Right
        for (let i = 1; i <= horizontalEnd; i++) {
            const sprite = scene.add.sprite((centerX + i) * TILE_WIDTH, centerY * TILE_WIDTH, 'explosion')
            sprite.setOrigin(0, 0)
            sprite.setDepth(2)
            sprite.anims.play(i === horizontalEnd ? ANIMS.explosion.right.end : ANIMS.explosion.right.middle)
            this.horizontalSprites.push(sprite)
        }
    }

    destroy() {
        this.centerSprite.destroy()
        this.verticalSprites.forEach(s => s.destroy())
        this.horizontalSprites.forEach(s => s.destroy())
    }
}
