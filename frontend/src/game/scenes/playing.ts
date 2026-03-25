import { Scene } from 'phaser';
import { ObjManager } from '../objManager';
import { MapType } from '../types';
import { loadAllSprites, ManSpriteKey } from '../sprite';
import { createAllAnims } from '../animations';
import { gameMap, TILE_WIDTH } from '../gameConfig';
import { InputManager } from '../inputManager';
import { wsEmitter } from '../../websocket';
import { EventManager } from '../eventManager';
import { TimeSyncManager } from '../timeSyncManager';
import { HudScene } from '../uiScenes/hud';
import { CreateBombEvent, PlayerMoveEvent } from '../events';

const MOVE_INTERVAL = 150
const GAME_DURATION = 10 * 60 * 1000
const HOST_MAN_KEY: ManSpriteKey = "man1"

export class PlayingScene extends Scene {
    currentMap: MapType
    objManager: ObjManager
    inputManager: InputManager
    eventManager: EventManager
    timeSyncManager: TimeSyncManager
    selfManSpriteKey: ManSpriteKey = "man1"
    slefManState = {
        bombPower: 2,
        bombNum: 1,
        speed: 1
    }
    private lastMoveTime = 0
    private gameActive = false
    private isAlive = true
    private gameEndTime = 0

    private get hud(): HudScene {
        return this.scene.get('hud') as HudScene
    }

    constructor() {
        super('playing');
    }

    preload() {
        loadAllSprites(this)
    }

    create() {
        createAllAnims(this)
        this.inputManager = new InputManager(this.input)
        this.objManager = new ObjManager(this, gameMap)
        this.eventManager = new EventManager(this.objManager)

        this.timeSyncManager = new TimeSyncManager(
            this.selfManSpriteKey,
            this.selfManSpriteKey === HOST_MAN_KEY,
            () => this.gameEndTime,
            (t) => { this.gameEndTime = t },
        )

        const self = this
        this.initListenGame()
        this.scene.launch('countdown', {
            onComplete: () => {
                this.activateGame()
                self.scene.launch('hud')
            }
        })
    }

    shutdown() {
        this.timeSyncManager?.destroy()
        this.scene.stop('hud')
    }

    private activateGame() {
        this.gameActive = true
        this.gameEndTime = Date.now() + GAME_DURATION
        this.time.delayedCall(GAME_DURATION, () => this.endGame())
        this.timeSyncManager.start()
    }

    // ─── Game end ─────────────────────────────────────────────────────────────

    private endGame() {
        this.gameActive = false
    }

    // ─── Update loop ─────────────────────────────────────────────────────────
    handleInput(time: number) {

        const playerObj = this.objManager.players.find(p => p.manSpriteKey === this.selfManSpriteKey)
        if (!playerObj) return

        const dir = this.inputManager.getDirectionPressed()

        let x = playerObj.sprite.x
        let y = playerObj.sprite.y
        if (dir !== null) {
            if (time - this.lastMoveTime >= MOVE_INTERVAL) {
                this.lastMoveTime = time
                const speed = this.slefManState.speed
                if (dir === "up") y -= speed
                if (dir === "down") y += speed
                if (dir === "left") x -= speed
                if (dir === "right") x += speed

                const canMove = this.objManager.canManMoveByPosition({x, y})
                const event: PlayerMoveEvent = {
                    type: "playerMove",
                    payload: {
                        manKey: this.selfManSpriteKey,
                        x: canMove ? playerObj.sprite.x : x,
                        y: canMove ? playerObj.sprite.y : y,
                        dir,
                        isMoving: canMove,
                    }
                }
                this.eventManager.handleEvent(event)
                if (canMove) wsEmitter.send("move", event.payload as never)
            }
        } else if (playerObj.isMoving) {
            const event: PlayerMoveEvent = {
                type: "playerMove",
                payload: { manKey: this.selfManSpriteKey, x, y, dir: playerObj.dir, isMoving: false }
            }
            this.eventManager.handleEvent(event)
            wsEmitter.send("move", event.payload as never)
        }
        const bombPower = this.slefManState.bombPower
        if (this.inputManager.isBombPressed()) {
            const manCenteIndex = playerObj.getCenterMapIndex()
            const event: CreateBombEvent = {
                type: "createBomb",
                payload: { manKey: this.selfManSpriteKey, x: manCenteIndex.x, y: manCenteIndex.y, bombPower }
            }
            this.eventManager.handleEvent(event)
            wsEmitter.send("generateBomb", event.payload as never)
        }
    }
    update(time: number, _delta: number): void {
        if (this.gameActive) {
            this.hud.setTimer(Math.max(0, this.gameEndTime - Date.now()))
        }

        if (!this.gameActive || !this.isAlive) return
        this.handleInput(time)
    }

    // ─── WS listeners ────────────────────────────────────────────────────────

    initListenGame() {
        wsEmitter.on("move", payload => {
            this.eventManager.handleEvent({ type: "playerMove", payload: payload as never })
        })
        wsEmitter.on("generateBomb", payload => {
            this.eventManager.handleEvent({ type: "createBomb", payload: payload as never })
        })
    }



}
