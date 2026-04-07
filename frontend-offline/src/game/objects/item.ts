import { ANIMS } from "../sprite_animations/animations";
import { MapIndex } from "../types";
import { BaseObj } from "./base";
import type { ItemType } from "../event/events"
export type { ItemType } from "../event/events"
export class ItemObj extends BaseObj {
    constructor(
        scene: Phaser.Scene,
        index: MapIndex,
        itemType: ItemType
    ) {
        super(scene, index, "items", 0, "item");
        this.sprite.anims.play(ANIMS.item[itemType])
    }
}
