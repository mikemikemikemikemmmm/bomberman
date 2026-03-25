import { Scene } from "phaser"
import {  TILE_WIDTH } from "./gameConfig"
import { SpriteKey } from "./sprite"

export const tranIndexToPosition = (index: { y: number, x: number }) => {
    return { y: index.y * TILE_WIDTH, x: index.x * TILE_WIDTH }
}
export const tranPositionToIndex = (position: { y: number, x: number }) => {
    return { y: Math.floor(position.y / TILE_WIDTH), x: Math.floor(position.x / TILE_WIDTH) }
}
// export const addSprite = (scene: Scene, yIndex: number, xIndex: number, spriteKey: SpriteKey,  startFrame?: number) => {
//     const s = scene.add.sprite(xIndex*TILE_WIDTH, yIndex*TILE_WIDTH, spriteKey, startFrame )
//     s.setOrigin(0, 0)
//     return s
// }