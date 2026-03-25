import { Scene } from "phaser";
import { MapType, Position } from "./types";
import { TILE_WIDTH, WINDOW_H, WINDOW_W } from "./gameConfig";
import { BaseObj } from "./objects/base";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { tranPositionToIndex } from "./utils";

export class ObjManager {
    background: Phaser.GameObjects.RenderTexture
    players: ManObj[] = []
    bricks: BaseObj[] = []
    staticItems: BaseObj[] = []
    bombs: BombObj[] = []
    scene: Scene
    map: MapType
    constructor(scene: Scene, map: MapType) {
        this.scene = scene
        this.map = map
        this.initByMap()
    }
    canManMoveByPosition(pos: Position) {
        const mapIndex = tranPositionToIndex(pos)
        const { x, y } = mapIndex
        if (this.map[y][x] === "wall") {
            return false
        }
        const hasBrick = this.bricks.some(b => {
            const bIdx = b.getCenterMapIndex()
            if (bIdx.x === x && bIdx.y === y) {
                return true
            }
            return false
        })
        const hasBomb = this.bombs.some(b => {
            const bIdx = b.getCenterMapIndex()
            if (bIdx.x === x && bIdx.y === y) {
                return true
            }
            return false
        })
        return !(hasBrick || hasBomb)
    }
    initByMap() {
        const map = this.map
        const scene = this.scene
        const background = scene.add.renderTexture(0, 0, WINDOW_W, WINDOW_H);
        background.setOrigin(0, 0)
        for (let y = 0; y < map.length; y++) {
            const row = map[y];
            for (let x = 0; x < row.length; x++) {
                const col = row[x];
                switch (col) {
                    case "wall":
                        const wallImg = scene.make.sprite({ key: "items", frame: 3 });
                        wallImg.setOrigin(0, 0);
                        background.draw(wallImg, x * TILE_WIDTH, y * TILE_WIDTH);
                        wallImg.destroy();
                        break;
                    case "brick":
                        const b = new BaseObj(scene, y, x, "items", 4)
                        this.bricks.push(b)
                        map[y][x] = null
                        break
                    case "man1":
                    case "man2":
                    case "man3":
                    case "man4":
                        const m = new ManObj(scene, x, y, col)
                        this.players.push(m)
                        map[y][x] = null
                        break
                }
            }
        }
        this.background = background
    }
}