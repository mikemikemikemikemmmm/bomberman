import { ManSpriteKey } from "./sprite_animations/sprite"
import { OriginMapMatrix } from "./types"
export const TILE_WIDTH = 48
export const TILE_Y_NUM = 20
export const TILE_X_NUM = 20
export const FPS = 30


export const START_SPEED =10;
export const MAX_SPEED = 20;

export const START_BOMB_NUM =2;
export const MAX_BOMB_NUM = 6;

export const START_BOMB_POWER = 2;
export const MAX_BOMB_POWER = 6;


export const BACKGROUND_COLOR = "#398400"

export const COUNTDOWN_MS = {
    bomb: 1000,
    ruiningBrick: 500,
    fire: 500
}

export const FRAME_RATE = 20 // a second render FRAME_RATE frame
export const HALF_TILE_WIDTH = Math.floor(TILE_WIDTH / 2)


export const WINDOW_W = TILE_X_NUM * TILE_WIDTH
export const WINDOW_H = WINDOW_W


export enum SCENE_MAP {
    PLAYING = 'playing',
    TIMER = 'timer',
    COUNT_DOWN = 'countDown'
}



export const gameMapMatrix: OriginMapMatrix = [
  Array(10).fill("wall"),

  ["wall","man1",null,"brick",null,null,"brick",null,null,"wall"],

  ["wall",null,"brick",null,"brick",null,null,"brick",null,"wall"],

  ["wall",null,null,"brick",null,"brick",null,null,"brick","wall"],

  ["wall","brick",null,null,null,null,null,"brick",null,"wall"],

  ["wall",null,"brick",null,"brick",null,"brick",null,null,"wall"],

  ["wall",null,null,"brick",null,null,null,"brick","man2","wall"],

  ["wall","brick",null,null,"brick",null,null,null,"brick","wall"],

  ["wall","man3",null,"brick",null,"brick",null,null,"man4","wall"],

  Array(10).fill("wall"),
];