import React from "react"
import ReactDom from "react-dom/client"
import { AUTO } from "phaser"

import { UI_DOM_ID, GAME_DOM_ID } from "./config"
import { BACKGROUND_COLOR, FPS, gameMapMatrix, WINDOW_H, WINDOW_W } from "./game/gameConfig"
import { PlayingScene } from "./game/playingScene"
import { TimerUIScene } from "./game/uiScenes/timerUI"
import { CountdownScene } from "./game/uiScenes/countdown"
import { wsEmitter } from "./websocket"
import UIRootApp from "./ui/uiRoot"
import { GameMetaData, useGlobalStore } from "./store"
import { ManSpriteKey } from "./game/sprite_animations/sprite"

export class App {
    game?: Phaser.Game
    ui?: ReactDom.Root

    constructor() {
        this.init()
    }

    async init() {
        // await this.initWebsocket()
        this.initUI()
        this.startPlaying() //test
    }
    async initWebsocket() {
        try {
            wsEmitter.init()
            const userId = await wsEmitter.waitForUserId()
            useGlobalStore.getState().setUserId(userId)
        } catch {
            alert("連線失敗，請重新整理頁面")
        }
    }

    initUI() {
        const bindStartPlaying = this.startPlaying.bind(this)
        const root = document.getElementById(UI_DOM_ID) as HTMLDivElement
        if (!root) return
        this.ui = ReactDom.createRoot(root)
        this.ui.render(
            <React.StrictMode>
                <UIRootApp startPlaying={bindStartPlaying} />
            </React.StrictMode>
        )
    }

    initGame() {
        const config: Phaser.Types.Core.GameConfig = {
            type: AUTO,
            width: WINDOW_W,
            height: WINDOW_H,
            parent: GAME_DOM_ID,
            backgroundColor: BACKGROUND_COLOR,
            render: { pixelArt: true },
            scene: [PlayingScene, TimerUIScene, CountdownScene],
            fps: { target: FPS, forceSetTimeOut: true },
            callbacks: {
                preBoot: (game: Phaser.Game) => {
                    game.registry.set('emitEndPlaying', this.endPlaying.bind(this))
                },
            },
        }
        this.game = new Phaser.Game(config)
    }
    async getGameMetaData(): Promise<GameMetaData> {
        //TODO
        return {
            gameId: 1,
            players:[
                {
                    name:"guest",
                    manSpriteKey:ManSpriteKey.Man1,
                    userId:1
                }
            ],
            gameEndTime:10,
            originMapMatrix:gameMapMatrix
        }
    }
    async startPlaying() {
        if (this.game) {
            this.game.destroy(true, false)
            this.game = undefined
        }
        const gameState: GameMetaData = await this.getGameMetaData()
        useGlobalStore.getState().setGameMetaData(gameState)
        useGlobalStore.getState().setRoomId(null)
        this.initGame()
    }

    endPlaying() {
        if (!this.game) return
        this.game.events.once(Phaser.Core.Events.DESTROY, () => {
            this.game = undefined
        })
        useGlobalStore.getState().setGameMetaData(null)
        useGlobalStore.getState().setRoomId(null)
        this.game.destroy(true, false)
    }
}
new App()