import { ANIMS } from "../sprite_animations/animations";
import { MapIndex } from "../types";
import { BaseObj } from "./base";
import type { ItemType } from "../event/events"
export type { ItemType } from "../event/events"
export class ItemObj extends BaseObj {
    constructor(
        scene: Phaser.Scene,
        index: MapIndex,
        private itemType:ItemType
    ) {
        super(scene, index, "items", 0, "item");
        this.sprite.setZ(0)
        this.sprite.anims.play(ANIMS.item[itemType])
    }
}
