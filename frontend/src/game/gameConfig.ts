import { MapMetaData } from "./types"

export const BACKGROUND_COLOR = "#398400"
export const FRAME_RATE = 5
export const TILE_WIDTH = 64
export const HALF_TILE_WIDTH = Math.floor(TILE_WIDTH / 2)

export const TILE_Y_NUM = 10
export const TILE_X_NUM = 10

export const WINDOW_W = TILE_X_NUM * TILE_WIDTH
export const WINDOW_H = WINDOW_W

export const RENDER_INTERVAL_MS = 150
export const GAME_DURATION = 10 * 60 * 1000

// Matches backend4 MAP_1 exactly
export const gameMap: MapMetaData = {
    height: 10,
    width: 10,
    map: [
        ["wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall"],
        ["wall",  "man1",  null,    "brick", null,    null,    "brick", null,    null,    "wall"],
        ["wall",  null,    "brick", null,    "brick", null,    null,    "brick", null,    "wall"],
        ["wall",  null,    null,    "brick", null,    "brick", null,    null,    "brick", "wall"],
        ["wall",  "brick", null,    null,    null,    null,    null,    "brick", null,    "wall"],
        ["wall",  null,    "brick", null,    "brick", null,    "brick", null,    null,    "wall"],
        ["wall",  null,    null,    "brick", null,    null,    null,    "brick", "man2",  "wall"],
        ["wall",  "brick", null,    null,    "brick", null,    null,    null,    "brick", "wall"],
        ["wall",  "man3",  null,    "brick", null,    "brick", null,    null,    "man4",  "wall"],
        ["wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall",  "wall"],
    ]
}

export enum SCENE_MAP {
    PLAYING   = 'playing',
    TIMER     = 'timer',
    COUNT_DOWN = 'countDown'
}
