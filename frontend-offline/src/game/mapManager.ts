import { TILE_WIDTH, WINDOW_H, WINDOW_W } from "./gameConfig";
import { ManObj } from "./objects/man";
import { MapMatrix, MapTile, Position, MapTileType, MapIndex, OriginMapMatrix } from "./types";
import { tranPositionToIndex } from "./utils";
import { ManSpriteKey } from "./sprite_animations/sprite";
import { BrickObj } from "./objects/brick";
import { useGlobalStore } from "../store";
import { ALL_MAP } from "../mapData";

export class MapManager {
    background: Phaser.GameObjects.RenderTexture
    map!: MapMatrix

    constructor(private scene: Phaser.Scene, private playerList: ManObj[]) {
        const mapId = useGlobalStore.getState().mapId
        const targetMap = ALL_MAP.find(m => m.id === mapId)
        if (!targetMap) {
            throw Error("no map")
        }

        this.initByMap(targetMap.matrix)
    }
    cleanMapTileByIndex(index: MapIndex) {
        this.map[index.indexY][index.indexX] = null
    }
    setMapTileByIndex(index: MapIndex, obj: MapTile) {
        this.map[index.indexY][index.indexX] = obj
    }
    isTileEmpty(index: MapIndex) {
        return this.map[index.indexY][index.indexX] === null
    }
    getMapTileByIndex(pos: MapIndex) {
        return this.map[pos.indexY][pos.indexX]
    }
    getMapTileTypeByIndex(pos: MapIndex): MapTileType {
        const tile = this.map[pos.indexY][pos.indexX]
        if (!tile) return "empty"
        if (tile === 'wall') return 'wall'
        return tile.getObjType()
    }
    canManMoveByPosition(pos: Position, manObj: ManObj) {
        //tile width would cover to next tile , need to  -1
        const fourPoint: Position[] = [
            { posX: pos.posX, posY: pos.posY },
            { posX: pos.posX + TILE_WIDTH - 1, posY: pos.posY },
            { posX: pos.posX, posY: pos.posY + TILE_WIDTH - 1 },
            { posX: pos.posX + TILE_WIDTH - 1, posY: pos.posY + TILE_WIDTH - 1 },
        ]
        return fourPoint.every(_pos => {
            const mapIndex = tranPositionToIndex(_pos)
            const mapTileType = this.getMapTileTypeByIndex(mapIndex)
            if (mapTileType === "bomb") {
                const isOverlappingCanPassBomb = manObj.canPassBombPosList.some(bombPos =>
                    _pos.posX >= bombPos.posX &&
                    _pos.posX < bombPos.posX + TILE_WIDTH &&
                    _pos.posY >= bombPos.posY &&
                    _pos.posY < bombPos.posY + TILE_WIDTH
                )
                return isOverlappingCanPassBomb
            }
            if (mapTileType === "brick" || mapTileType === "wall") return false
            return true
        })
    }
    initByMap(matrix: OriginMapMatrix) {
        const h = matrix.length
        const w = matrix[0].length
        const mapMatrix: MapMatrix = Array.from({ length: h }, () => Array(w).fill(null))
        this.map = mapMatrix
        const scene = this.scene
        const background = scene.add.renderTexture(0, 0, WINDOW_W, WINDOW_H)
        background.setOrigin(0, 0)


        for (let y = 0; y < h; y++) {
            const row = matrix[y]
            for (let x = 0; x < row.length; x++) {
                const col = row[x]
                switch (col) {
                    case "wall": {
                        const wallImg = scene.make.sprite({ key: "items", frame: 3 })
                        wallImg.setOrigin(0, 0)
                        background.draw(wallImg, x * TILE_WIDTH, y * TILE_WIDTH)
                        wallImg.destroy()
                        mapMatrix[y][x] = 'wall'
                        break
                    }
                    case "brick": {
                        const brick = new BrickObj(scene, { indexY: y, indexX: x })
                        this.setMapTileByIndex({ indexY: y, indexX: x }, brick)
                        break
                    }
                    case ManSpriteKey.Man1:
                    case ManSpriteKey.Man2: {
                        // Only spawn players that are actually in the game
                        const m = new ManObj(scene, { indexY: y, indexX: x }, col, 1)
                        this.playerList.push(m)
                        mapMatrix[y][x] = null  // players don't occupy the map tile
                        break
                    }
                }
            }
        }
        this.background = background
        this.map = mapMatrix
    }
}
