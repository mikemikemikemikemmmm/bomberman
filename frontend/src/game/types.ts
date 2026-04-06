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
    y: number, x: number
}
export interface MapIndex {
    y: number, x: number
}
export interface GameState{
    players:{
        manSpriteKey:ManSpriteKey,
        name:string,
        isSelf:boolean
    }[],
    gameEndTime:number,
    originMapMatrix:OriginMapMatrix
}

export interface CountdownMapIndex{
    y:number,
    x:number,
    remainingMs:number
    manSpriteKey?: ManSpriteKey
}