
import { MapType } from "./types"

// export const SCALE = 4
// export const FRAME_WIDTH = 16
export const BACKGROUND_COLOR = "#398400"
export const FRAME_RATE = 10
export const TILE_WIDTH = 64
export const HALF_TILE_WIDTH = Math.floor(TILE_WIDTH/2)

export const TILE_Y_NUM = 10
export const TILE_X_NUM = 10

export const WINDOW_W = TILE_X_NUM * TILE_WIDTH
export const WINDOW_H = WINDOW_W
export const gameMap: MapType = [
  ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null, "man1", null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null, "brick", null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall", null,  null,  null,  null,  null,  null,  null,  null, "wall"],
  ["wall","wall","wall","wall","wall","wall","wall","wall","wall","wall"]
];

