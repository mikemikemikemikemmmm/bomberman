import { ObjManager } from '../game/objManager'
import { TILE_X_NUM, TILE_Y_NUM, TILE_WIDTH } from '../game/gameConfig'

/**
 * Returns a 10x10 boolean grid where true means the tile is dangerous:
 * - Currently on fire
 * - Within blast range of an active bomb
 */
export function computeDangerMap(objManager: ObjManager): boolean[][] {
    const danger: boolean[][] = Array.from({ length: TILE_Y_NUM }, () =>
        Array(TILE_X_NUM).fill(false)
    )

    // Mark tiles currently on fire
    for (const fire of objManager.fires) {
        const allSprites = [fire.centerSprite, ...fire.verticalSprites, ...fire.horizontalSprites]
        for (const sprite of allSprites) {
            const ix = sprite.x / TILE_WIDTH
            const iy = sprite.y / TILE_WIDTH
            if (iy >= 0 && iy < TILE_Y_NUM && ix >= 0 && ix < TILE_X_NUM) {
                danger[iy][ix] = true
            }
        }
    }

    // Mark tiles in the blast range of active bombs
    const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    for (const bomb of objManager.bombs) {
        const { indexX, indexY } = bomb.getMapIndex()
        danger[indexY][indexX] = true

        for (const [dx, dy] of dirs) {
            for (let i = 1; i <= bomb.power; i++) {
                const nx = indexX + dx * i
                const ny = indexY + dy * i
                if (nx < 0 || nx >= TILE_X_NUM || ny < 0 || ny >= TILE_Y_NUM) break
                const tileType = objManager.mapManager.getMapTileTypeByIndex({ indexX: nx, indexY: ny })
                if (tileType === 'wall') break
                danger[ny][nx] = true
                if (tileType === 'brick' || tileType === 'bomb') break
            }
        }
    }

    return danger
}
