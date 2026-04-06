import { ManSpriteKey } from "./sprite_animations/sprite"
import {  OriginMapMatrix } from "./types"
export const FPS = 30
export const BACKGROUND_COLOR = "#398400"
export const FRAME_RATE = 6 // a second render FRAME_RATE frame
export const TILE_WIDTH = 64
export const HALF_TILE_WIDTH = Math.floor(TILE_WIDTH / 2)

export const TILE_Y_NUM = 10
export const TILE_X_NUM = 10

export const WINDOW_W = TILE_X_NUM * TILE_WIDTH
export const WINDOW_H = WINDOW_W


// Matches backend4 MAP_1 exactly
export const gameMapMatrix: OriginMapMatrix = [
    ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
    ["wall", ManSpriteKey.Man1, null, "brick", null, null, "brick", null, null, "wall"],
    ["wall", null, null, null, null, null, null, null, null, "wall"],
    ["wall", null, null, null, null, "brick", null, null, "brick", "wall"],
    ["wall", null, null, null, null, null, null, "brick", null, "wall"],
    ["wall", null, null, null, "brick", null, "brick", null, null, "wall"],
    ["wall", null, null, null, null, null, null, "brick", ManSpriteKey.Man2, "wall"],
    ["wall", null, null, null, null, null, null, null, "brick", "wall"],
    ["wall", ManSpriteKey.Man3, null, null, null, "brick", null, null, ManSpriteKey.Man4, "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
]

export enum SCENE_MAP {
    PLAYING = 'playing',
    TIMER = 'timer',
    COUNT_DOWN = 'countDown'
}
export const COINTDOWN_MS = {
    bomb: 1000,
    ruiningBrick: 1000,
    fire: 1000
}