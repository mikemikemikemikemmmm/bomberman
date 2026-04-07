import { ManSpriteKey } from "./sprite_animations/sprite"
import { PressedDir } from "./types"

export class InputManager {
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin
    p1: {
        lastDir: PressedDir,
        bombKey: Phaser.Input.Keyboard.Key,
        upKey: Phaser.Input.Keyboard.Key,
        rightKey: Phaser.Input.Keyboard.Key,
        downKey: Phaser.Input.Keyboard.Key,
        leftKey: Phaser.Input.Keyboard.Key,
    }
    p2: {
        lastDir: PressedDir,
        bombKey: Phaser.Input.Keyboard.Key
        upKey: Phaser.Input.Keyboard.Key,
        rightKey: Phaser.Input.Keyboard.Key,
        downKey: Phaser.Input.Keyboard.Key,
        leftKey: Phaser.Input.Keyboard.Key,
    }
    constructor(input: Phaser.Input.InputPlugin) {
        const keyboard = input.keyboard;
        if (!keyboard) {
            throw new Error("no keyboard");
        }
        this.keyboard = keyboard
        this.p1 = {
            lastDir: "down",
            bombKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
            upKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            rightKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            downKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            leftKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        }
        this.p2 = {
            lastDir: "down",
            bombKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH),
            upKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            rightKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
            downKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA),
            leftKey: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
        }
    }
    getDirectionPressed(manSpriteKey: ManSpriteKey): PressedDir {
        let p
        if (manSpriteKey === ManSpriteKey.Man1) {
            p = this.p1
        } else {
            p = this.p2
        }
        if (p.upKey.isDown) { p.lastDir = "up"; return "up" }
        if (p.downKey.isDown) { p.lastDir = "down"; return "down" }
        if (p.leftKey.isDown) { p.lastDir = "left"; return "left" }
        if (p.rightKey.isDown) { p.lastDir = "right"; return "right" }
        return null
    }

    isBombButtonPressed(manSpriteKey: ManSpriteKey): boolean {
        let p
        if (manSpriteKey === ManSpriteKey.Man1) {
            p = this.p1
        } else {
            p = this.p2
        }
        return Phaser.Input.Keyboard.JustDown(p.bombKey)
    }
}