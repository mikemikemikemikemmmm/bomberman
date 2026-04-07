import { Scene } from 'phaser'
import { WINDOW_W, WINDOW_H, SCENE_MAP } from '../gameConfig'

const START = 3

interface CountdownData {
    onComplete: () => void
}

export class CountdownScene extends Scene {
    constructor() {
        super(SCENE_MAP.COUNT_DOWN)
    }

    create(data: CountdownData) {
        const cx = WINDOW_W / 2
        const cy = WINDOW_H / 2

        const label = this.add.text(cx, cy, String(START), {
            fontSize: '128px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center',
        }).setOrigin(0.5)

        let count = START

        const tick = () => {
            count--
            if (count > 0) {
                label.setText(String(count))
                this.tweens.add({ targets: label, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true })
                this.time.delayedCall(1000, tick)
            } else {
                label.setText('GO!')
                this.tweens.add({
                    targets: label,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 600,
                    onComplete: () => {
                        data.onComplete()
                        this.scene.stop()
                    },
                })
            }
        }

        this.tweens.add({ targets: label, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true })
        this.time.delayedCall(1000, tick)
    }
}
