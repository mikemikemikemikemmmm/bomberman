import { PlayerMoveEvent } from "./events"
import { ManObj } from "./objects/man"

export type Direction = "up" | "down" | "left" | "right"

export class InputManager {
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    bombKey: Phaser.Input.Keyboard.Key
    lastDir: Direction = "down"

    constructor(input: Phaser.Input.InputPlugin) {
        const keyboard = input.keyboard;
        if (!keyboard) {
            throw new Error("no keyboard");
        }
        this.keyboard = keyboard
        this.cursors = keyboard.createCursorKeys()
        this.bombKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    }

    getDirectionPressed(): Direction | null {
        const { up, down, left, right } = this.cursors
        if (up.isDown)    { this.lastDir = "up";    return "up" }
        if (down.isDown)  { this.lastDir = "down";  return "down" }
        if (left.isDown)  { this.lastDir = "left";  return "left" }
        if (right.isDown) { this.lastDir = "right"; return "right" }
        return null
    }

    isBombPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.bombKey)
    }
}
