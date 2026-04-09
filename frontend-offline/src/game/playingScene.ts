import { Scene } from 'phaser';
import { ObjManager } from './objManager';
import { loadAllSprites, ManSpriteKey } from './sprite_animations/sprite';
import { createAllAnims } from './sprite_animations/animations';
import { SCENE_MAP } from './gameConfig';
import { InputManager } from './inputManager';
import { MapManager } from './mapManager';
import { AIController } from '../ai';

export class PlayingScene extends Scene {
    mapManager: MapManager
    objManager: ObjManager
    inputManager: InputManager
    aiController: AIController
    private gameActive = false
    private gameEndTime: number
    hasLoadedAssets = false
    constructor() {
        super(SCENE_MAP.PLAYING);
    }

    preload() {
        loadAllSprites(this)
    }
    async create() {
        if (!this.hasLoadedAssets) {
            createAllAnims(this)
            this.hasLoadedAssets = true

        }
        this.inputManager = new InputManager(this.input)
        this.objManager = new ObjManager(this)
        this.aiController = new AIController(this.objManager)
        // this.eventManager = new EventManager(this.objManager)


        // this.timeSyncManager = new TimeSyncManager(
        //     selfSpriteKey,
        //     isHost,
        //     () => this.gameEndTime,
        //     (t) => { this.gameEndTime = t },
        // )
        // this.activateGame()

        this.scene.launch(SCENE_MAP.COUNT_DOWN, {
            onComplete: () => {
                this.activateGame()
                // this.scene.launch(SCENE_MAP.TIMER)
            }
        })
    }

    checkGameOver() {
        const alivePlayers = this.objManager.players.filter(p => p.isAlive)
        if (alivePlayers.length > 1) return
        this.endGame()
        const winner = alivePlayers[0]?.manSpriteKey ?? null
        this.scene.launch(SCENE_MAP.GAME_OVER, {
            winner,
            onRestart: () => this.scene.restart(),
        })
    }
    update(_: number, delta: number): void {
        // if (this.gameActive) {
        //     this.getTimerUiScene()?.setTimer(Math.max(0, this.gameEndTime - Date.now()))
        // }
        if (!this.gameActive) return
        // this.eventManager.consumeStateChangeEvent()
        this.handleKeyboard(ManSpriteKey.Man1)
        this.handleAI()
        this.objManager.handleCountdownObjTime(delta)
        this.objManager.checkPlayerDie()
        this.objManager.checkPlayerEatItem()
        this.checkGameOver()

    }

    handleAI() {
        const aiMan = this.objManager.players.find(p => p.manSpriteKey === ManSpriteKey.Man2)
        if (!aiMan || !aiMan.isAlive) return
        const { dir, placeBomb } = this.aiController.getInput()
        if (dir) {
            this.objManager.handleSelfPositionChange(aiMan, dir)
        } else {
            aiMan.sprite.anims.stop()
        }
        if (placeBomb) {
            this.objManager.handlePlaceBomb(aiMan)
        }
    }

    handleKeyboard(manSpriteKey: ManSpriteKey) {
        const playobj = this.objManager.players.find(p => p.manSpriteKey === manSpriteKey)
        if (!playobj || !playobj.isAlive) {
            return
        }
        const pressedDir = this.inputManager.getDirectionPressed(manSpriteKey)
        if (pressedDir) {
            this.objManager.handleSelfPositionChange(playobj, pressedDir)
        } else {
            playobj.sprite.anims.stop()
        }
        if (this.inputManager.isBombButtonPressed(manSpriteKey)) {
            this.objManager.handlePlaceBomb(playobj)
        }
    }

    private endGame() {
        this.gameActive = false
        // this.scene.stop(SCENE_MAP.TIMER)
    }


    // shutdown() {
    // this.timeSyncManager?.destroy()
    // this.eventManager?.destroy()
    // this.scene.stop(SCENE_MAP.COUNT_DOWN)
    // this.scene.stop(SCENE_MAP.TIMER)
    // }

    activateGame() {
        this.gameActive = true
        this.time.delayedCall(
            Math.max(0, this.gameEndTime - Date.now()),
            () => this.endGame()
        )
        // this.timeSyncManager.start()
    }
}
