import { ANIMS } from "../sprite_animations/animations";
import { MapIndex } from "../types";
import { BaseObj } from "./base";
import type { ItemType } from "../event/events"
export type { ItemType } from "../event/events"
export class ItemObj extends BaseObj {
    itemType: ItemType
    constructor(
        scene: Phaser.Scene,
        index: MapIndex,
        itemType: ItemType
    ) {
        super(scene, index, "items", 0, "item");
        this.itemType = itemType
        this.sprite.anims.play(ANIMS.item[itemType])
    }
}
