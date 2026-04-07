import { COUNTDOWN_MS } from "../gameConfig";
import { ANIMS } from "../sprite_animations/animations";
import { ManSpriteKey, SpriteKey } from "../sprite_animations/sprite";
import { MapIndex } from "../types";
import { BaseObj } from "./base";

export class BombObj extends BaseObj {
    remainingMs: number = COUNTDOWN_MS.bomb
    constructor(
        scene: Phaser.Scene,
        index: MapIndex,
        public power: number,
        public manSpriteKey: ManSpriteKey
    ) {
        super(scene, index, "items", 0, "bomb");
        this.sprite.anims.play(ANIMS.item.bomb)
    }
    triggerExplode() {
        //TODO
    }
}
