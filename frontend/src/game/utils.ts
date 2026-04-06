import {  TILE_WIDTH } from "./gameConfig"
export const tranIndexToPosition = (index: { y: number, x: number }) => {
    return { y: index.y * TILE_WIDTH, x: index.x * TILE_WIDTH }
}
export const tranPositionToIndex = (position: { y: number, x: number }) => {
    return { y: Math.floor(position.y / TILE_WIDTH), x: Math.floor(position.x / TILE_WIDTH) }
}