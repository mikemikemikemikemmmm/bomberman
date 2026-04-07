
import ReactDom from "react-dom/client"
import { AUTO } from "phaser"

import { GAME_DOM_ID } from "./config"
import { BACKGROUND_COLOR, FPS,  WINDOW_H, WINDOW_W } from "./game/gameConfig"
import { PlayingScene } from "./game/playingScene"
import { TimerUIScene } from "./game/uiScenes/timerUI"
import { CountdownScene } from "./game/uiScenes/countdown"
import { GameOverScene } from "./game/uiScenes/gameover"

export class App {
    game?: Phaser.Game
    ui?: ReactDom.Root

    constructor() {
        this.init()
    }

    async init() {
        this.startPlaying() //test
    }


    initGame() {
        const config: Phaser.Types.Core.GameConfig = {
            type: AUTO,
            width: WINDOW_W,
            height: WINDOW_H,
            parent: GAME_DOM_ID,
            backgroundColor: BACKGROUND_COLOR,
            render: { pixelArt: true },
            scene: [PlayingScene, TimerUIScene, CountdownScene, GameOverScene],
            fps: { target: FPS, forceSetTimeOut: true },
            callbacks: {
                preBoot: (game: Phaser.Game) => {
                    game.registry.set('emitEndPlaying', this.endPlaying.bind(this))
                },
            },
        }
        this.game = new Phaser.Game(config)
    }
    async startPlaying() {
        if (this.game) {
            this.game.destroy(true, false)
            this.game = undefined
        }
        this.initGame()
    }

    endPlaying() {
        if (!this.game) return
        this.game.events.once(Phaser.Core.Events.DESTROY, () => {
            this.game = undefined
        })
        this.game.destroy(true, false)
    }
}
new App()