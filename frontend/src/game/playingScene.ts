import { Scene } from 'phaser';
import { ObjManager } from './objManager';
import { loadAllSprites } from './sprite_animations/sprite';
import { createAllAnims } from './sprite_animations/animations';
import {  SCENE_MAP } from './gameConfig';
import { InputManager } from './inputManager';
import { EventManager } from './event/eventManager';
import { TimeSyncManager } from './timeSyncManager';
import { useGlobalStore } from '../store';
import { TimerUIScene } from './uiScenes/timerUI';
import { MapManager } from './mapManager';
import { wsEmitter } from '../websocket';


export class PlayingScene extends Scene {
    mapManager: MapManager
    objManager: ObjManager
    inputManager: InputManager
    eventManager: EventManager
    timeSyncManager: TimeSyncManager
    private lastRenderTimeMs = 0
    private gameActive = false
    private isAlive = true
    private gameEndTime: number

    constructor() {
        super(SCENE_MAP.PLAYING);
    }

    preload() {
        loadAllSprites(this)
    }
    async create() {
        createAllAnims(this)
        const gameMetaData = useGlobalStore.getState().gameMetaData
        if (!gameMetaData) {
            throw Error("error")
        }
        this.inputManager = new InputManager(this.input)
        this.objManager = new ObjManager(this, gameMetaData)
        this.eventManager = new EventManager(this.objManager)


        // this.timeSyncManager = new TimeSyncManager(
        //     selfSpriteKey,
        //     isHost,
        //     () => this.gameEndTime,
        //     (t) => { this.gameEndTime = t },
        // )
        this.activateGame()

        // this.scene.launch(SCENE_MAP.COUNT_DOWN, {
        //     onComplete: () => {
        //         this.activateGame()
        //         this.scene.launch(SCENE_MAP.TIMER)
        //     }
        // })
    }

    private getTimerUiScene(): TimerUIScene | null {
        return this.scene.get(SCENE_MAP.TIMER) as TimerUIScene | null
    }
    update(gameTotalTimeMs: number, _delta: number): void {
        if (this.gameActive) {
            this.getTimerUiScene()?.setTimer(Math.max(0, this.gameEndTime - Date.now()))
        }
        if (!this.gameActive) return
        this.objManager.handleCountdownObjTime(_delta)
        this.handleRenderGameFrame()
        this.lastRenderTimeMs = gameTotalTimeMs
    }

    handleRenderGameFrame() {
        this.eventManager.consumeStateChangeEvent()
        const selfPlayerObj = this.objManager.players.find(p => p.isSelf)
        if (!selfPlayerObj) {
            if (this.isAlive) {
                this.isAlive = false
                this.getTimerUiScene()?.showSpectating()
            }
            return
        }
        const pressedDir = this.inputManager.getDirectionPressed()
        if (pressedDir) {
            const successPayload = this.objManager.handleSelfPositionChange(selfPlayerObj, pressedDir)
            if (successPayload) {
                wsEmitter.sendEventToServer("playerMove", successPayload as never)
            }
        } else {
            selfPlayerObj.sprite.anims.stop()
        }
        if (this.inputManager.isBombButtonPressed()) {
            const successPayload = this.objManager.handleSelfPlaceBomb(selfPlayerObj)
            if (successPayload) {
                wsEmitter.sendEventToServer("generateBomb", successPayload as never)
            }
        }
    }

    private endGame() {
        this.gameActive = false
        this.scene.stop(SCENE_MAP.TIMER)
    }


    shutdown() {
        this.timeSyncManager?.destroy()
        this.eventManager?.destroy()
        this.scene.stop(SCENE_MAP.COUNT_DOWN)
        this.scene.stop(SCENE_MAP.TIMER)
    }

    activateGame() {
        this.gameActive = true
        this.time.delayedCall(
            Math.max(0, this.gameEndTime - Date.now()),
            () => this.endGame()
        )
        // this.timeSyncManager.start()
    }
}
