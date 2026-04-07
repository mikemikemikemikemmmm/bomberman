import {  TILE_WIDTH } from "./gameConfig"
import { MapIndex, Position } from "./types"
export const tranIndexToPosition = (index: MapIndex): Position => {
    return { posY: index.indexY * TILE_WIDTH, posX: index.indexX * TILE_WIDTH }
}
export const tranPositionToIndex = (position: Position): MapIndex => {
    return { indexY: Math.floor(position.posY / TILE_WIDTH), indexX: Math.floor(position.posX / TILE_WIDTH) }
}