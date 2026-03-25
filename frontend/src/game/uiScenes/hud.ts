import { Scene } from 'phaser'
import { WINDOW_W, WINDOW_H } from '../gameConfig'

export class HudScene extends Scene {
    private timerText:    Phaser.GameObjects.Text
    private spectateText: Phaser.GameObjects.Text

    constructor() {
        super('hud')
    }

    create() {
        this.timerText = this.add.text(WINDOW_W - 8, 8, '10:00', {
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0)

        this.spectateText = this.add.text(WINDOW_W / 2, WINDOW_H - 32, 'SPECTATING', {
            fontSize: '18px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setVisible(false)
    }

    setTimer(remaining: number) {
        if (!this.timerText) return
        const totalSec = Math.ceil(remaining / 1000)
        const mins = Math.floor(totalSec / 60).toString().padStart(2, '0')
        const secs = (totalSec % 60).toString().padStart(2, '0')
        this.timerText.setText(`${mins}:${secs}`)
        if (remaining <= 30_000) this.timerText.setColor('#ff4444')
    }

    showSpectating() {
        this.spectateText?.setVisible(true)
    }
}
