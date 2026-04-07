import { Scene } from 'phaser'
import { WINDOW_W, WINDOW_H, SCENE_MAP } from '../gameConfig'
import { ManSpriteKey } from '../sprite_animations/sprite'

interface GameOverData {
    winner: ManSpriteKey | null
    onRestart: () => void
}

export class GameOverScene extends Scene {
    constructor() {
        super(SCENE_MAP.GAME_OVER)
    }

    create(data: GameOverData) {
        const cx = WINDOW_W / 2
        const cy = WINDOW_H / 2

        // Dim background
        this.add.rectangle(cx, cy, WINDOW_W, WINDOW_H, 0x000000, 0.6)

        // Result text
        const resultLabel = data.winner === ManSpriteKey.Man1
            ? 'Player 1 Wins!'
            : data.winner === ManSpriteKey.Man2
                ? 'Player 2 Wins!'
                : 'Draw!'

        this.add.text(cx, cy - 60, resultLabel, {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center',
        }).setOrigin(0.5)

        // Play Again button
        const btn = this.add.text(cx, cy + 60, 'Play Again', {
            fontSize: '36px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })

        btn.on('pointerover', () => btn.setColor('#ffffff'))
        btn.on('pointerout', () => btn.setColor('#ffff00'))
        btn.on('pointerdown', () => {
            this.scene.stop()
            data.onRestart()
        })
    }
}
