import { Scene } from "phaser"
import { TILE_WIDTH } from "../gameConfig"


// Sprite 設定集中管理
const SPRITES = ['man1', 'man2', 'man3', 'man4', 'items', 'explosion'] as const
export enum ManSpriteKey {
    Man1 = "man1",
    Man2 = "man2",
    // Man3 = "man3",
    // Man4 = "man4"
}
export type SpriteKey = typeof SPRITES[number]

export const loadAllSprites = (scene: Scene) => {
    SPRITES.forEach(key => {
        const path = `assets/3x/${key}.png`
        scene.load.spritesheet(key, path, {
            frameWidth: TILE_WIDTH,
            frameHeight: TILE_WIDTH,
        })
    })
}
export const staticSpriteMap = {
    wall: {
        spriteKey: "item",
        frame: 3
    },
    brick: {
        spriteKey: "item",
        frame: 4
    },
}