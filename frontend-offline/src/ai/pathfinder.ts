import { TILE_X_NUM, TILE_Y_NUM } from '../game/gameConfig'
import { MapIndex, PressedDir } from '../game/types'
import { ObjManager } from '../game/objManager'

export interface PathResult {
    dir: PressedDir
    steps: number
}

const DIRS: { dx: number; dy: number; dir: PressedDir }[] = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' },
    { dx: 1, dy: 0, dir: 'right' },
]

/**
 * BFS from `start` toward `target`. Returns the first direction to take and
 * the total steps, or null if no path exists.
 *
 * When `avoidDanger` is true, tiles marked in dangerMap are skipped.
 */
export function bfsNextDir(
    start: MapIndex,
    target: MapIndex,
    objManager: ObjManager,
    dangerMap: boolean[][],
    avoidDanger: boolean
): PathResult | null {
    if (start.indexX === target.indexX && start.indexY === target.indexY) {
        return { dir: null, steps: 0 }
    }

    const visited = Array.from({ length: TILE_Y_NUM }, () => Array(TILE_X_NUM).fill(false))
    visited[start.indexY][start.indexX] = true

    const queue: { index: MapIndex; dir: PressedDir; steps: number }[] = []

    for (const { dx, dy, dir } of DIRS) {
        const nx = start.indexX + dx
        const ny = start.indexY + dy
        if (outOfBounds(nx, ny) || visited[ny][nx]) continue
        const tileType = objManager.mapManager.getMapTileTypeByIndex({ indexX: nx, indexY: ny })
        if (tileType === 'wall' || tileType === 'brick' || tileType === 'bomb') continue
        if (avoidDanger && dangerMap[ny][nx]) continue
        visited[ny][nx] = true
        queue.push({ index: { indexX: nx, indexY: ny }, dir, steps: 1 })
    }

    while (queue.length > 0) {
        const { index, dir, steps } = queue.shift()!
        if (index.indexX === target.indexX && index.indexY === target.indexY) {
            return { dir, steps }
        }

        for (const { dx, dy } of DIRS) {
            const nx = index.indexX + dx
            const ny = index.indexY + dy
            if (outOfBounds(nx, ny) || visited[ny][nx]) continue
            const tileType = objManager.mapManager.getMapTileTypeByIndex({ indexX: nx, indexY: ny })
            if (tileType === 'wall' || tileType === 'brick' || tileType === 'bomb') continue
            if (avoidDanger && dangerMap[ny][nx]) continue
            visited[ny][nx] = true
            queue.push({ index: { indexX: nx, indexY: ny }, dir, steps: steps + 1 })
        }
    }

    return null
}

/**
 * BFS to find the nearest tile NOT in dangerMap, starting from `start`.
 * Used after placing a bomb to escape the blast zone.
 * Does not skip bomb tiles so the AI can walk through its own bomb.
 */
export function findNearestSafeTile(
    start: MapIndex,
    objManager: ObjManager,
    dangerMap: boolean[][]
): PathResult | null {
    if (!dangerMap[start.indexY][start.indexX]) {
        return { dir: null, steps: 0 }
    }

    const visited = Array.from({ length: TILE_Y_NUM }, () => Array(TILE_X_NUM).fill(false))
    visited[start.indexY][start.indexX] = true

    const queue: { index: MapIndex; dir: PressedDir; steps: number }[] = []

    for (const { dx, dy, dir } of DIRS) {
        const nx = start.indexX + dx
        const ny = start.indexY + dy
        if (outOfBounds(nx, ny) || visited[ny][nx]) continue
        const tileType = objManager.mapManager.getMapTileTypeByIndex({ indexX: nx, indexY: ny })
        if (tileType === 'wall' || tileType === 'brick') continue
        visited[ny][nx] = true
        queue.push({ index: { indexX: nx, indexY: ny }, dir, steps: 1 })
    }

    while (queue.length > 0) {
        const { index, dir, steps } = queue.shift()!
        if (!dangerMap[index.indexY][index.indexX]) {
            return { dir, steps }
        }

        for (const { dx, dy } of DIRS) {
            const nx = index.indexX + dx
            const ny = index.indexY + dy
            if (outOfBounds(nx, ny) || visited[ny][nx]) continue
            const tileType = objManager.mapManager.getMapTileTypeByIndex({ indexX: nx, indexY: ny })
            if (tileType === 'wall' || tileType === 'brick') continue
            visited[ny][nx] = true
            queue.push({ index: { indexX: nx, indexY: ny }, dir, steps: steps + 1 })
        }
    }

    return null
}

function outOfBounds(x: number, y: number) {
    return x < 0 || x >= TILE_X_NUM || y < 0 || y >= TILE_Y_NUM
}
