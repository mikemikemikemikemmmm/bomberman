
type MapItem = "man1" | "man2" | "man3" | "man4" | "brick" | "wall" | null
export type MapType = MapItem[][]

export type ManDirection = "up" | "left" | "down" | "right"

export interface ManChangeData {
    x: number,
    y: number,
    dir: ManDirection,
    isMoving: boolean
}
export interface BombCreate {

}
export interface Position {
    y: number, x: number
}
export interface MapIndex {
    y: number, x: number
}