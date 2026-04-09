import { Scene } from 'phaser';
import { ObjManager } from './objManager';
import { loadAllSprites } from './sprite_animations/sprite';
import { createAllAnims } from './sprite_animations/animations';
import { SCENE_MAP } from './gameConfig';
import { InputManager } from './inputManager';
import { EventManager } from './event/eventManager';
import { TimeSyncManager } from './timeSyncManager';
import { useGlobalStore } from '../store';
import { TimerUIScene } from './uiScenes/timerUI';


export class PlayingScene extends Scene {
    inputManager: InputManager
    eventManager: EventManager
    timeSyncManager: TimeSyncManager
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
        this.gameEndTime = gameMetaData.gameEndTime
        this.inputManager = new InputManager(this.input)
        const objManager = new ObjManager(this, gameMetaData)
        this.eventManager = new EventManager(objManager, () => this.endGame())


        // this.timeSyncManager = new TimeSyncManager(
        //     selfSpriteKey,
        //     isHost,
        //     () => this.gameEndTime,
        //     (t) => { this.gameEndTime = t },
        // )
        this.activateGame()

        this.scene.launch(SCENE_MAP.COUNT_DOWN, {
            onComplete: () => {
                this.activateGame()
                this.scene.launch(SCENE_MAP.TIMER)
            }
        })
    }

    private getTimerUiScene(): TimerUIScene | null {
        return this.scene.get(SCENE_MAP.TIMER) as TimerUIScene | null
    }
    update(): void {
        // if (this.gameActive) {
        //     this.getTimerUiScene()?.setTimer(Math.max(0, this.gameEndTime - Date.now()))
        // }
        // if (!this.gameActive) return
        this.handleRenderGameFrame()
    }

    handleRenderGameFrame() {
        this.eventManager.consumeStateChangeEvent()
        const selfPlayerObj = this.eventManager.objManager.players.find(p => p.isSelf)
        // console.log(selfPlayerObj,213)
        if (!selfPlayerObj || !selfPlayerObj.isAlive) {
            this.getTimerUiScene()?.showSpectating()
            return
        }
        const pressedDir = this.inputManager.getDirectionPressed()
        if (pressedDir) {
            const successPayload = this.eventManager.objManager.handleSelfPositionChange(selfPlayerObj, pressedDir)
            this.eventManager.sendSelfManMoveEvent(successPayload)
        } else {
            selfPlayerObj.sprite.anims.stop()
        }
        if (this.inputManager.isBombButtonPressed()) {
            const successPayload = this.eventManager.objManager.handleSelfPlaceBomb(selfPlayerObj)
            if (successPayload) {
                this.eventManager.sendGenerateBombEvent(successPayload)
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
