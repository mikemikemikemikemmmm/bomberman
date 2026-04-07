import { ANIMS } from "../sprite_animations/animations";
import { MapIndex } from "../types";
import { BaseObj } from "./base";

export class BrickObj extends BaseObj {
    isRuining = false
    constructor(
        scene: Phaser.Scene,
        index: MapIndex) {
        super(scene, index, "items", 0, "brick");
        this.sprite.anims.play(ANIMS.item.brick)
    }
    triggerRuin(onRuinCompleteCb: (mapIndex: MapIndex) => void) {
        this.isRuining = true
        this.sprite.anims.play(ANIMS.item.brickRuin)
        this.sprite.on('animationcomplete', () => {
            this.sprite.destroy();
            onRuinCompleteCb(this.getMapIndex())
        });
    }
}
