import { BaseObj } from "./objects/base"

export type ObjType = "man" | "bomb" | "brick" | "wall" | "item"

export interface MapMetaData {
    width: number,
    height: number,
    map: ("man1" | "man2" | "man3" | "man4" | "brick" | "wall" | null)[][]
}
export type MapTile = null | BaseObj | "wall"
export type MapTileType = 'empty' | ObjType
export type MapMatrix = MapTile[][]
export type ManDirection = "up" | "left" | "down" | "right"
export type PressedDir = ManDirection | null

export interface Position {
    y: number, x: number
}
export interface MapIndex {
    y: number, x: number
}