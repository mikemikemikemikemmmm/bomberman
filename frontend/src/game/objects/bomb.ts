import { BaseObj } from "./base";

export class BombObj extends BaseObj {
    power: number
    constructor(scene: Phaser.Scene, indexX:number,indexY:number, power: number) {
        super(scene, indexX, indexY, "items", 0);
        this.power = power
    }
}
