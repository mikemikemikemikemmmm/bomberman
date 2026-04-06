import { Scene } from "phaser"
import { FRAME_RATE } from "../gameConfig"
import { SpriteKey } from "./sprite"

// 集中管理所有動畫 key
export const ANIMS = {
    man1: {
        up: "man1_up",
        left: "man1_left",
        down: "man1_down",
        right: "man1_right",
        die: "man1_die",
    },
    man2: {
        up: "man2_up",
        left: "man2_left",
        down: "man2_down",
        right: "man2_right",
        die: "man2_die",
    },
    man3: {
        up: "man3_up",
        left: "man3_left",
        down: "man3_down",
        right: "man3_right",
        die: "man3_die",
    },
    man4: {
        up: "man4_up",
        left: "man4_left",
        down: "man4_down",
        right: "man4_right",
        die: "man4_die",
    },
    item: {
        bomb: "bomb",
        wall: "wall",
        brick: "brick",
        brickRuin: "brickRuin",
        fire: "fire",
        speed: "speed",
        moreBomb: "moreBomb",
        power: "power",
    },
    explosion: {
        start: "explosion-start",
        up: {
            middle: "explosion-up-middle",
            end: "explosion-up-end"
        },
        right: {
            middle: "explosion-right-middle",
            end: "explosion-right-end"
        }, down: {
            middle: "explosion-down-middle",
            end: "explosion-down-end"
        }, left: {
            middle: "explosion-left-middle",
            end: "explosion-left-end"
        },
    }
} as const
export const createAllAnims = (scene: Scene) => {
    createAllManAnims(scene)
    createAllItemAnims(scene)
    createAllExplosionAnims(scene)
}

const createAllManAnims = (scene: Scene) => {
    const mans: SpriteKey[] = ['man1', 'man2', 'man3', 'man4']
    mans.forEach(m => {
        const config = ANIMS[m as 'man1' | 'man2' | 'man3' | 'man4'];
        createAnim(scene, config.left, m, 0, 2);
        createAnim(scene, config.down, m, 3, 5);
        createAnim(scene, config.right, m, 7, 9);
        createAnim(scene, config.up, m, 10, 12);
        createAnim(scene, config.die, m, 14, 20, false, false);
    })
}

const createAllItemAnims = (scene: Scene) => {
    const s: SpriteKey = 'items'
    createAnim(scene, ANIMS.item.bomb, s, 0, 2)
    createAnim(scene, ANIMS.item.wall, s, 3, 3, false, false)
    createAnim(scene, ANIMS.item.brick, s, 4, 4, false, false)
    createAnim(scene, ANIMS.item.brickRuin, s, 5, 10, false, false)
    createAnim(scene, ANIMS.item.fire, s, 11, 15, false, false) // ⚠️ frame 待確認
    createAnim(scene, ANIMS.item.speed, s, 16, 17, false, false) // ⚠️ frame 待確認
    createAnim(scene, ANIMS.item.moreBomb, s, 18, 19, false, false) // ⚠️ frame 待確認
}

const createAllExplosionAnims = (scene: Scene) => {
    const s: SpriteKey = 'explosion'
    createAnim(scene, ANIMS.explosion.start, s, 0, 3, true, true)
    createAnim(scene, ANIMS.explosion.down.middle, s, 4, 7, true, true)
    createAnim(scene, ANIMS.explosion.down.end, s, 8, 11, true, true)
    createAnim(scene, ANIMS.explosion.left.end, s, 12, 15, true, true)
    createAnim(scene, ANIMS.explosion.left.middle, s, 16, 19, true, true)
    createAnim(scene, ANIMS.explosion.up.end, s, 20, 23, true, true)
    createAnim(scene, ANIMS.explosion.up.middle, s, 24, 27, true, true)
    createAnim(scene, ANIMS.explosion.right.end, s, 31, 28, true, true)
    createAnim(scene, ANIMS.explosion.right.middle, s, 35, 32, true, true)
}

const createAnim = (
    scene: Scene,
    key: string,
    sprite: string,
    start: number,
    end: number,
    repeat = true,
    yoyo = true
) => {
    scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(sprite, { start, end }),
        frameRate: FRAME_RATE,
        repeat: repeat ? -1 : 0,
        yoyo,
    })
}