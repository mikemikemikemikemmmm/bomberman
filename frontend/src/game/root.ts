import { AUTO } from "phaser";
import {  BACKGROUND_COLOR, WINDOW_H, WINDOW_W } from "./gameConfig";
import { PlayingScene } from "./scenes/playing";
import { HudScene } from "./uiScenes/hud";
import { CountdownScene } from "./uiScenes/countdown";
import { GAME_DOM_ID } from "../config";

export class Game {
    game: Phaser.Game
    constructor(private endPlaying: () => void) {
        const config = {
               type: AUTO,
                width: WINDOW_W,
                height: WINDOW_H,
                parent: GAME_DOM_ID,
                backgroundColor: BACKGROUND_COLOR,
                render: {
                    pixelArt: true  // 關閉反鋸齒，像素風格必加
                },
                scene: [PlayingScene, HudScene, CountdownScene],
        }
        this.game = new Phaser.Game(config)
    }
}