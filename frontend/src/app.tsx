import React from "react"
import ReactDom from "react-dom/client"
import { AUTO } from "phaser"

import { UI_DOM_ID, GAME_DOM_ID } from "./config"
import { BACKGROUND_COLOR, WINDOW_H, WINDOW_W } from "./game/gameConfig"
import { PlayingScene } from "./game/playingScene"
import { TimerUIScene } from "./game/uiScenes/timerUI"
import { CountdownScene } from "./game/uiScenes/countdown"
import UIApp from "./ui/app"
import { wsEmitter } from "./websocket"
import type { RoomPlayer } from "./ui/types"
import { listenStartGameEvent, StartGameEvent, StartGamePayload } from "./globalEvent"

export class App {
    userId!: number
    game?: Phaser.Game
    ui?: ReactDom.Root

    constructor() {
        this.init()
    }

    async init() {
        await this.initWebsocket()
        // this.initUI()
        this.listenForGameStart()

    }

    async initWebsocket() {
        try {
            wsEmitter.init()
            this.userId = await wsEmitter.waitForUserId()
        } catch {
            alert("連線失敗，請重新整理頁面")
        }
    }

    initUI() {
        const root = document.getElementById(UI_DOM_ID) as HTMLDivElement
        if (!root) return
        this.ui = ReactDom.createRoot(root)
        this.ui.render(
            <React.StrictMode>
                <UIApp userId={this.userId} />
            </React.StrictMode>
        )
    }

    listenForGameStart() {
        const bindStartPlaying = this.startPlaying.bind(this)
        listenStartGameEvent(bindStartPlaying)
    }

    startPlaying(payload:StartGamePayload) {
        if (this.game) {
            this.game.destroy(true, false)
            this.game = undefined
        }
        this.emitSetPlaying(true)
        this.initGame(payload.gameEndTime, payload.players)
    }

    initGame(gameEndTime: number, players: RoomPlayer[]) {
        const config: Phaser.Types.Core.GameConfig = {
            type: AUTO,
            width: WINDOW_W,
            height: WINDOW_H,
            parent: GAME_DOM_ID,
            backgroundColor: BACKGROUND_COLOR,
            render: { pixelArt: true },
            scene: [PlayingScene, TimerUIScene, CountdownScene],
            fps: { target: 30, forceSetTimeOut: true },
            callbacks: {
                preBoot: (game: Phaser.Game) => {
                    game.registry.set('userId', this.userId)
                    game.registry.set('gameEndTime', gameEndTime)
                    game.registry.set('players', players)
                    game.registry.set('emitEndPlaying', this.endPlaying.bind(this))
                },
            },
        }
        this.game = new Phaser.Game(config)
    }

    emitSetPlaying = (isPlaying: boolean): void => {
        window.dispatchEvent(new CustomEvent<boolean>("gameUpdate", {
            detail: isPlaying,
            bubbles: true,
            cancelable: true,
        }))
    }

    endPlaying() {
        if (!this.game) return
        this.game.events.once(Phaser.Core.Events.DESTROY, () => {
            this.game = undefined
            this.emitSetPlaying(false)
        })
        this.game.destroy(true, false)
    }
}
