
export const TILE_WIDTH = 48
export const TILE_Y_NUM = 10
export const TILE_X_NUM = 10
export const FPS = 30
export const BACKGROUND_COLOR = "#398400"

export const BASE_MAN_SPEED = 10
export const COUNTDOWN_MS = {
    bomb: 3000,
    ruiningBrick: 500,
    fire: 500
}

export const FRAME_RATE = 10 // a second render FRAME_RATE frame
export const HALF_TILE_WIDTH = Math.floor(TILE_WIDTH / 2)


export const WINDOW_W = TILE_X_NUM * TILE_WIDTH
export const WINDOW_H = WINDOW_W


// Matches backend4 MAP_1 exactly
// export const gameMapMatrix: OriginMapMatrix = [
//     ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],

//     ["wall", ManSpriteKey.Man1, null, "brick", null, null, "brick", null, null, null, null, "brick", null, null, null, "brick", null, null, null, "wall"],

//     ["wall", null, null, null, null, null, null, null, null, "brick", null, null, null, null, null, null, null, null, null, "wall"],

//     ["wall", null, "brick", null, null, "brick", null, null, null, null, null, null, "brick", null, null, "brick", null, null, null, "wall"],

//     ["wall", null, null, null, null, null, null, "brick", null, null, null, null, null, null, "brick", null, null, null, null, "wall"],

//     ["wall", null, null, null, "brick", null, "brick", null, null, null, "brick", null, null, null, null, null, "brick", null, null, "wall"],

//     ["wall", null, null, null, null, null, null, "brick", ManSpriteKey.Man2, null, null, null, "brick", null, null, null, null, null, null, "wall"],

//     ["wall", null, "brick", null, null, null, null, null, "brick", null, null, null, null, null, "brick", null, null, null, null, "wall"],

//     ["wall", ManSpriteKey.Man3, null, null, null, "brick", null, null, ManSpriteKey.Man4, null, null, "brick", null, null, null, null, "brick", null, null, "wall"],

//     ["wall", null, null, "brick", null, null, null, null, null, null, "brick", null, null, null, null, null, null, "brick", null, "wall"],

//     ["wall", null, null, null, null, "brick", null, null, null, null, null, null, "brick", null, null, "brick", null, null, null, "wall"],

//     ["wall", null, "brick", null, null, null, null, "brick", null, null, null, "brick", null, null, null, null, null, null, null, "wall"],

//     ["wall", null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, "wall"],

//     ["wall", null, null, null, null, null, "brick", null, null, null, null, null, "brick", null, null, null, "brick", null, null, "wall"],

//     ["wall", null, "brick", null, null, null, null, null, "brick", null, null, null, null, null, null, null, null, null, null, "wall"],

//     ["wall", null, null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, "brick", null, null, null, "wall"],

//     ["wall", null, null, "brick", null, null, null, null, null, null, null, null, "brick", null, null, null, null, "brick", null, "wall"],

//     ["wall", null, null, null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, null, null, null, "wall"],

//     ["wall", null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, "brick", null, null, null, null, "wall"],

//     ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
// ];
export enum SCENE_MAP {
    PLAYING = 'playing',
    TIMER = 'timer',
    COUNT_DOWN = 'countDown',
    GAME_OVER = 'gameOver'
}

