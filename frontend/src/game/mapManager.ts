import { TILE_WIDTH, WINDOW_H, WINDOW_W } from "./gameConfig";
import { BaseObj } from "./objects/base";
import { BombObj } from "./objects/bomb";
import { ManObj } from "./objects/man";
import { MapMetaData, MapMatrix, Position, MapTileType } from "./types";
import { tranPositionToIndex } from "./utils";

export class MapManager {
    background: Phaser.GameObjects.RenderTexture
    map!: MapMatrix
    constructor(mapMetaData: MapMetaData, private scene: Phaser.Scene, private playerList: ManObj[]) {
        this.initByMap(mapMetaData)
    }

    setMapTileByIndex(pos: { x: number, y: number }, obj: BaseObj) {
        this.map[pos.y][pos.x] = obj
    }
    getMapTileByIndex(pos: { x: number, y: number }) {
        return this.map[pos.y][pos.x]
    }
    getMapTileTypeByIndex(pos: { x: number, y: number }): MapTileType {
        const tile = this.map[pos.y][pos.x]
        if (!tile) {
            return "empty"
        }
        if (tile === 'wall') {
            return 'wall'
        }
        return tile.getObjType()
    }
    canManMoveByPosition(pos: Position, manObj: ManObj) {
        const EPSILON = 0.1// 極小偏移量
        const fourPoint = [
            { x: pos.x + EPSILON, y: pos.y + EPSILON }, // 左上
            { x: pos.x + TILE_WIDTH - EPSILON, y: pos.y + EPSILON }, // 右上
            { x: pos.x + EPSILON, y: pos.y + TILE_WIDTH - EPSILON }, // 左下
            { x: pos.x + TILE_WIDTH - EPSILON, y: pos.y + TILE_WIDTH - EPSILON } // 右下
        ];
        return fourPoint.every(_pos => {
            const mapIndex = tranPositionToIndex(_pos);

            const { x, y } = mapIndex;
            // 安全檢查：確保索引在分佈範圍內
            if (!this.map[y] || this.map[y][x] === undefined) {
                return false
            };
            const mapTileType =this.getMapTileTypeByIndex(mapIndex)
            if (mapTileType  ==="bomb") {
                const isOverlappingCanPassBomb = manObj.canPassBombPosList.some(bPos => {
                    return (
                        _pos.x < bPos.x + TILE_WIDTH &&
                        _pos.x + TILE_WIDTH > bPos.x &&
                        _pos.y < bPos.y + TILE_WIDTH &&
                        _pos.y + TILE_WIDTH > bPos.y
                    );
                });
                // console.log( manObj.canPassBombPosList)
                if (isOverlappingCanPassBomb) {
                    console.log("isOverlappingCanPassBomb")
                    return true;
                }
                
            }
            const maptileType = this.getMapTileTypeByIndex(mapIndex);
            if (maptileType === 'bomb' || maptileType === "brick" || maptileType === "wall") {
               
                    console.log("aaa")
                return false;
            }
            return true;
        });
    }
    initByMap(mapMetaData: MapMetaData) {
        const { map, width, height } = mapMetaData
        const mapMatrix: MapMatrix = Array.from({ length: height }, () => Array(width).fill(null));
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
                        mapMatrix[y][x] = 'wall'
                        break;
                    case "brick":
                        mapMatrix[y][x] = new BaseObj(scene, { y, x }, "items", 4, "brick")
                        break
                    case "man1":
                    case "man2":
                    case "man3":
                    case "man4":
                        const userId = this.scene.registry.get("userId")
                        const m = new ManObj(scene, { y, x }, col, userId)
                        this.playerList.push(m)
                        break
                }
            }
        }
        this.background = background
        this.map = mapMatrix
    }
}