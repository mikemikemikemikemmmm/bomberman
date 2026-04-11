import * as ort from 'onnxruntime-web'
import { TILE_X_NUM, TILE_Y_NUM, TILE_WIDTH, COUNTDOWN_MS } from './gameConfig'
import { ObjManager } from './objManager'
import { ManSpriteKey } from './sprite_animations/sprite'
import { PressedDir } from './types'
import { BombObj } from './objects/bomb'

// Matches Python env/bomberman_env.py ACTIONS list
const ACTIONS: { dir: PressedDir; placeBomb: boolean }[] = [
    { dir: null,    placeBomb: false }, // 0 noop
    { dir: 'up',    placeBomb: false }, // 1 up
    { dir: 'down',  placeBomb: false }, // 2 down
    { dir: 'left',  placeBomb: false }, // 3 left
    { dir: 'right', placeBomb: false }, // 4 right
    { dir: null,    placeBomb: true  }, // 5 bomb only
    { dir: 'up',    placeBomb: true  }, // 6 bomb+up
    { dir: 'down',  placeBomb: true  }, // 7 bomb+down
    { dir: 'left',  placeBomb: true  }, // 8 bomb+left
    { dir: 'right', placeBomb: true  }, // 9 bomb+right
]

const OBS_CHANNELS = 7
const OBS_GRID_SIZE = OBS_CHANNELS * TILE_Y_NUM * TILE_X_NUM // 700
const OBS_SCALARS = 8
const OBS_SIZE = OBS_GRID_SIZE + OBS_SCALARS // 708

export class OnnxAiController {
    private session: ort.InferenceSession | null = null
    private ready = false

    // Throttle: decide every N ms (matches ~3 substeps × 33ms = ~100ms)
    private decisionIntervalMs = 100
    private timeSinceLastDecision = 0
    private lastDecision = ACTIONS[0]

    async load(modelUrl: string): Promise<void> {
        this.session = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['wasm'],
        })
        this.ready = true
    }

    get isReady(): boolean {
        return this.ready
    }

    async decide(
        delta: number,
        om: ObjManager,
        aiKey: ManSpriteKey,
        oppKey: ManSpriteKey,
    ): Promise<{ dir: PressedDir; placeBomb: boolean }> {
        this.timeSinceLastDecision += delta
        if (!this.ready || this.session === null) return ACTIONS[0]
        if (this.timeSinceLastDecision < this.decisionIntervalMs) {
            return this.lastDecision
        }
        this.timeSinceLastDecision = 0

        const obs = buildObs(om, aiKey, oppKey)
        const tensor = new ort.Tensor('float32', obs, [1, OBS_SIZE])
        const results = await this.session.run({ obs: tensor })
        const probs = results['action_probs'].data as Float32Array

        // argmax
        let best = 0
        for (let i = 1; i < probs.length; i++) {
            if (probs[i] > probs[best]) best = i
        }

        this.lastDecision = ACTIONS[best]
        return this.lastDecision
    }
}

// ---------------------------------------------------------------------------
// Observation builder — mirrors Python env/bomberman_env.py build_obs()
// ---------------------------------------------------------------------------

function buildObs(om: ObjManager, selfKey: ManSpriteKey, oppKey: ManSpriteKey): Float32Array {
    const grid = new Float32Array(OBS_GRID_SIZE) // 7 × 10 × 10

    for (let iy = 0; iy < TILE_Y_NUM; iy++) {
        for (let ix = 0; ix < TILE_X_NUM; ix++) {
            const tileType = om.mapManager.getMapTileTypeByIndex({ indexX: ix, indexY: iy })

            if (tileType === 'wall') {
                grid[0 * 100 + iy * 10 + ix] = 1
            } else if (tileType === 'brick') {
                grid[1 * 100 + iy * 10 + ix] = 1
            } else if (tileType === 'bomb') {
                const bomb = om.mapManager.getMapTileByIndex({ indexX: ix, indexY: iy }) as BombObj
                grid[2 * 100 + iy * 10 + ix] = Math.max(0, bomb.remainingMs / COUNTDOWN_MS.bomb)
            } else if (tileType === 'item') {
                grid[4 * 100 + iy * 10 + ix] = 1
            }
        }
    }

    // Fire tiles (ch 3)
    for (const fire of om.fires) {
        const allSprites = [fire.centerSprite, ...fire.verticalSprites, ...fire.horizontalSprites]
        for (const sprite of allSprites) {
            const fx = Math.round(sprite.x / TILE_WIDTH)
            const fy = Math.round(sprite.y / TILE_WIDTH)
            if (fx >= 0 && fx < TILE_X_NUM && fy >= 0 && fy < TILE_Y_NUM) {
                grid[3 * 100 + fy * 10 + fx] = 1
            }
        }
    }

    // Player positions
    const selfMan = om.players.find(p => p.manSpriteKey === selfKey)
    const oppMan = om.players.find(p => p.manSpriteKey === oppKey)

    if (selfMan && selfMan.isAlive) {
        const { indexX: sx, indexY: sy } = selfMan.getCenterMapIndex()
        if (sx >= 0 && sx < TILE_X_NUM && sy >= 0 && sy < TILE_Y_NUM) {
            grid[5 * 100 + sy * 10 + sx] = 1
        }
    }
    if (oppMan && oppMan.isAlive) {
        const { indexX: ox, indexY: oy } = oppMan.getCenterMapIndex()
        if (ox >= 0 && ox < TILE_X_NUM && oy >= 0 && oy < TILE_Y_NUM) {
            grid[6 * 100 + oy * 10 + ox] = 1
        }
    }

    // Scalar features [700..707]
    const scalars = new Float32Array(OBS_SCALARS)
    const MAX_SPEED = 12
    const MAX_BOMBS = 6
    const MAX_POWER = 6

    if (selfMan && selfMan.isAlive) {
        scalars[0] = selfMan.speed / MAX_SPEED
        scalars[1] = (selfMan.bombNum - selfMan.usedBombNum) / MAX_BOMBS
        scalars[2] = selfMan.bombPower / MAX_POWER
        scalars[3] = 0 // isDying — not tracked separately in TS, man is removed on death
    }
    if (oppMan && oppMan.isAlive) {
        scalars[4] = oppMan.speed / MAX_SPEED
        scalars[5] = (oppMan.bombNum - oppMan.usedBombNum) / MAX_BOMBS
        scalars[6] = oppMan.bombPower / MAX_POWER
        scalars[7] = 0
    }

    const obs = new Float32Array(OBS_SIZE)
    obs.set(grid, 0)
    obs.set(scalars, OBS_GRID_SIZE)
    return obs
}
