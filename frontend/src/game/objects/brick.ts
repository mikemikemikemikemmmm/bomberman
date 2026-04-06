import { ANIMS } from "../sprite_animations/animations";
import { SpriteKey } from "../sprite_animations/sprite";
import { MapIndex } from "../types";
import { BaseObj } from "./base";

export class BrickObj extends BaseObj {
    constructor(
        scene: Phaser.Scene,
        index: MapIndex) {
        super(scene, index, "items", 0, "brick");
        this.sprite.setZ(0)
        this.sprite.anims.play(ANIMS.item.bomb)
    }
}
