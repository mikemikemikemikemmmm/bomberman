import { BaseObj } from "./objects/base"
import { ManSpriteKey } from "./sprite_animations/sprite"

export type ObjType = "man" | "bomb" | "brick" | "wall" | "item" | "fire"
export type MapTileType = 'empty' | ObjType
export type OriginMapMatrix =(ManSpriteKey| "brick" | "wall" | null)[][]
export type MapTile = null | BaseObj | "wall"
export type MapMatrix = MapTile[][]
export type ManDirection = "up" | "left" | "down" | "right"
export type PressedDir = ManDirection | null

export interface Position {
    posY: number, posX: number
}
export interface MapIndex {
    indexY: number, indexX: number
}
export interface CountdownMapIndex{
    y:number,
    x:number,
    remainingMs:number
    manSpriteKey?: ManSpriteKey
}