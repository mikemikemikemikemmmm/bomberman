import { Scene } from 'phaser';
import { ObjManager } from './objManager';
import { loadAllSprites } from './sprite_animations/sprite';
import { createAllAnims } from './sprite_animations/animations';
import { gameMap, SCENE_MAP, TILE_WIDTH } from './gameConfig';
import { InputManager } from './inputManager';
import { wsEmitter } from '../websocket';
import { EventManager } from './event/eventManager';
import { TimeSyncManager } from './timeSyncManager';
import { TimerUIScene } from './uiScenes/timerUI';

const MOVE_INTERVAL = 150
const GAME_DURATION = 10 * 60 * 1000

export class PlayingScene extends Scene {
    objManager: ObjManager
    inputManager: InputManager
    eventManager: EventManager
    timeSyncManager: TimeSyncManager
    private lastMoveTime = 0
    private gameActive = true
    private isAlive = true
    private gameEndTime = 0

    private getTimerUiScene(): TimerUIScene {
        return this.scene.get(SCENE_MAP.TIMER) as TimerUIScene
    }
    getUserId() {
        return this.registry.get("userId")
    }
    constructor() {
        super(SCENE_MAP.PLAYING);
    }

    preload() {
        loadAllSprites(this)
    }
    async create() {
        createAllAnims(this)
        this.objManager = new ObjManager(this, gameMap)
        this.eventManager = new EventManager(this.objManager)
        this.inputManager = new InputManager(this.input)

        // this.timeSyncManager = new TimeSyncManager(
        //     this.selfManSpriteKey,
        //     this.selfManSpriteKey === HOST_MAN_KEY,
        //     () => this.gameEndTime,
        //     (t) => { this.gameEndTime = t },
        // )

        const self = this
        this.initListenGameEventFromServer()
        this.scene.launch(SCENE_MAP.COUNT_DOWN, {
            onComplete: () => {
                this.activateGame()
                self.scene.launch(SCENE_MAP.TIMER)
            }
        })
    }
    update(time: number, _delta: number): void {
        // if (this.gameActive) {
        //     const timerUIScene = this.getTimerUiScene()
        //     timerUIScene.setTimer(Math.max(0, this.gameEndTime - Date.now()))
        // }
        // console.log(213)
        // if (!this.gameActive || !this.isAlive) return
        if (time - this.lastMoveTime < MOVE_INTERVAL) {
            return
        }
        const userId = this.getUserId()
        const playerObj = this.objManager.players.find(p => p.userId === userId)
        if (!playerObj) {
            return
        }
        const pressedDir = this.inputManager.getDirectionPressed()
        if (pressedDir) {
            this.objManager.handlePositionChange(time, playerObj, pressedDir)
        }
        if (this.inputManager.isBombPressed()) {
            this.objManager.handlePlaceBomb(time, playerObj)
        }
    }
    initListenGameEventFromServer() {
        wsEmitter.on("playerMove", payload => {
            this.eventManager.handleEvent({ type: "playerMove", payload: payload as never })
        })
        wsEmitter.on("generateBomb", payload => {
            this.eventManager.handleEvent({ type: "generateBomb", payload: payload as never })
        })
    }
    private endGame() {
        this.gameActive = false
    }

    shutdown() {
        this.timeSyncManager?.destroy()
        this.scene.stop(SCENE_MAP.COUNT_DOWN)
    }

    activateGame() {
        this.gameActive = true
        this.gameEndTime = Date.now() + GAME_DURATION
        this.time.delayedCall(GAME_DURATION, () => this.endGame())
        // this.timeSyncManager.start()
    }


}
