// ✅ Import 整理：分組排列（第三方 → 內部 config → 內部模組）
import React from "react"
import ReactDom from "react-dom/client"
import { AUTO } from "phaser"

import { UI_DOM_ID, GAME_DOM_ID } from "./config"
import { BACKGROUND_COLOR, WINDOW_H, WINDOW_W } from "./game/gameConfig"
import { PlayingScene } from "./game/playingScene"
import { TimerUIScene } from "./game/uiScenes/timerUI"
import { CountdownScene } from "./game/uiScenes/countdown"
import UIApp from "./ui/app"

export interface GameUpdateDetail {
    playing: boolean
}

export class App {
    userId!: number
    game?: Phaser.Game
    ui?: ReactDom.Root
    // ✅ 移除未使用的 isPlaying

    constructor() {
        this.init()
    }

    async init() {
        await this.initWebsocket()
        // this.initUI()
        this.initGame()
    }

    async initWebsocket() {
        // try {
        //     wsEmitter.init()
        //     this.userId = await wsEmitter.waitForUserId()
        // } catch (error) {
        //     alert("初始化錯誤")
        // }
        this.userId = 1123
    }

    initUI() {
        const root = document.getElementById(UI_DOM_ID) as HTMLDivElement
        if (!root) return

        this.ui = ReactDom.createRoot(root)
        this.ui.render(
            <React.StrictMode>
                {/* ✅ bind 確保 this 正確，避免 callback 中 this 丟失 */}
                <UIApp
                    userId={this.userId}
                    // emitGameUpdate={this.emitGameUpdate.bind(this)}
                />
            </React.StrictMode>
        )
    }

    initGame() {
        // ✅ 防護：避免重複建立 Phaser 實例造成記憶體洩漏
        if (this.game) {
            console.warn("initGame() called while game is already running. Destroying first.")
            this.game.destroy(true, false)
            this.game = undefined
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: AUTO,
            width: WINDOW_W,
            height: WINDOW_H,
            parent: GAME_DOM_ID,
            backgroundColor: BACKGROUND_COLOR,
            render: {
                pixelArt: true
            },
            scene: [PlayingScene, TimerUIScene, CountdownScene],
            fps: {
                target: 30,
                forceSetTimeOut: true
            },
            callbacks: {
                preBoot: (game: Phaser.Game) => {
                    game.registry.set('userId', this.userId)
                    // ✅ bind 確保 endPlaying 內的 this 正確指向 App 實例
                    game.registry.set('emitEndPlaying', this.endPlaying.bind(this))
                },
            },
        }

        this.game = new Phaser.Game(config)
    }

    // ✅ 改為 arrow function 或在呼叫處 bind，這裡用 arrow function 是最簡潔的做法
    emitSetPlaying = (isPlaying: boolean): void => {
        const event = new CustomEvent<boolean>("gameUpdate", {
            detail: isPlaying,
            bubbles: true,
            cancelable: true,
        })
        window.dispatchEvent(event)
    }

    startPlaying() {
        // ✅ initGame 內部已有防護，這裡不需要重複 destroy
        this.emitSetPlaying(true)
        this.initGame()
    }

    endPlaying() {
        if (!this.game) return // ✅ 防護：避免在無遊戲時呼叫

        this.game.events.once(Phaser.Core.Events.DESTROY, () => {
            // ✅ 清除參考，避免 stale reference
            this.game = undefined
            this.emitSetPlaying(false)
        })

        this.game.destroy(true, false)
    }
}