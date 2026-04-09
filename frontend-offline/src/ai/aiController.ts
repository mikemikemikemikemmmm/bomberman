import { ObjManager } from '../game/objManager'
import { ManSpriteKey } from '../game/sprite_animations/sprite'
import { PressedDir, MapIndex } from '../game/types'
import { computeDangerMap } from './dangerMap'
import { bfsNextDir, findNearestSafeTile } from './pathfinder'

type AIState = 'HUNT' | 'ESCAPE'

export interface AIInput {
    dir: PressedDir
    placeBomb: boolean
}

export class AIController {
    private state: AIState = 'HUNT'

    constructor(
        private objManager: ObjManager,
        private aiKey: ManSpriteKey = ManSpriteKey.Man2,
        private targetKey: ManSpriteKey = ManSpriteKey.Man1
    ) {}

    getInput(): AIInput {
        const aiMan = this.objManager.players.find(p => p.manSpriteKey === this.aiKey)
        if (!aiMan || !aiMan.isAlive) return { dir: null, placeBomb: false }

        const aiIndex = aiMan.getCenterMapIndex()
        const dangerMap = computeDangerMap(this.objManager)
        const inDanger = dangerMap[aiIndex.indexY][aiIndex.indexX]

        // Always escape when in danger
        if (inDanger) this.state = 'ESCAPE'

        if (this.state === 'ESCAPE') {
            const escape = findNearestSafeTile(aiIndex, this.objManager, dangerMap)
            if (!escape || escape.steps === 0) {
                this.state = 'HUNT'
                return { dir: null, placeBomb: false }
            }
            return { dir: escape.dir, placeBomb: false }
        }

        // HUNT state — chase and bomb the target player
        const targetMan = this.objManager.players.find(p => p.manSpriteKey === this.targetKey)
        if (!targetMan || !targetMan.isAlive) return { dir: null, placeBomb: false }

        const targetIndex = targetMan.getCenterMapIndex()

        // Try to place a bomb if the explosion would reach the target in a straight line
        if (aiMan.usedBombNum < aiMan.bombNum) {
            if (this.canHitTarget(aiIndex, targetIndex, aiMan.bombPower)) {
                this.state = 'ESCAPE'
                return { dir: null, placeBomb: true }
            }
        }

        // Move toward the target, preferring safe paths
        const path = bfsNextDir(aiIndex, targetIndex, this.objManager, dangerMap, true)
        if (path) return { dir: path.dir, placeBomb: false }

        // Fallback: ignore danger (AI is boxed in)
        const fallback = bfsNextDir(aiIndex, targetIndex, this.objManager, dangerMap, false)
        return { dir: fallback?.dir ?? null, placeBomb: false }
    }

    /**
     * Returns true if a bomb placed at `from` would reach `target` along an
     * unobstructed straight line within `power` tiles.
     */
    private canHitTarget(from: MapIndex, target: MapIndex, power: number): boolean {
        const sameRow = from.indexY === target.indexY
        const sameCol = from.indexX === target.indexX
        if (!sameRow && !sameCol) return false

        const dist = sameRow
            ? Math.abs(from.indexX - target.indexX)
            : Math.abs(from.indexY - target.indexY)
        if (dist > power) return false

        // Check for obstacles between from and target
        const dx = sameRow ? Math.sign(target.indexX - from.indexX) : 0
        const dy = sameCol ? Math.sign(target.indexY - from.indexY) : 0
        for (let i = 1; i < dist; i++) {
            const tileType = this.objManager.mapManager.getMapTileTypeByIndex({
                indexX: from.indexX + dx * i,
                indexY: from.indexY + dy * i,
            })
            if (tileType === 'wall' || tileType === 'brick') return false
        }
        return true
    }
}
