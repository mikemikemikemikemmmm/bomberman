import { TILE_WIDTH, WINDOW_H, WINDOW_W } from "./gameConfig";
import { BaseObj } from "./objects/base";
import { BombObj } from "./objects/bomb";
import { ManObj } from "./objects/man";
import { MapMetaData, MapMatrix, Position, MapTileType } from "./types";
import { tranPositionToIndex } from "./utils";
import type { RoomPlayer } from "../ui/types";

export class MapManager {
    background: Phaser.GameObjects.RenderTexture
    map!: MapMatrix
    bricks: BaseObj[] = []

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
        if (!tile) return "empty"
        if (tile === 'wall') return 'wall'
        return tile.getObjType()
    }
    canManMoveByPosition(pos: Position, manObj: ManObj) {
        const EPSILON = 0.1
        const fourPoint = [
            { x: pos.x + EPSILON,              y: pos.y + EPSILON },
            { x: pos.x + TILE_WIDTH - EPSILON,  y: pos.y + EPSILON },
            { x: pos.x + EPSILON,              y: pos.y + TILE_WIDTH - EPSILON },
            { x: pos.x + TILE_WIDTH - EPSILON,  y: pos.y + TILE_WIDTH - EPSILON },
        ]
        return fourPoint.every(_pos => {
            const mapIndex = tranPositionToIndex(_pos)
            const { x, y } = mapIndex
            if (!this.map[y] || this.map[y][x] === undefined) return false
            const mapTileType = this.getMapTileTypeByIndex(mapIndex)
            if (mapTileType === "bomb") {
                const isOverlappingCanPassBomb = manObj.canPassBombPosList.some(bPos =>
                    _pos.x < bPos.x + TILE_WIDTH &&
                    _pos.x + TILE_WIDTH > bPos.x &&
                    _pos.y < bPos.y + TILE_WIDTH &&
                    _pos.y + TILE_WIDTH > bPos.y
                )
                return isOverlappingCanPassBomb
            }
            if (mapTileType === "brick" || mapTileType === "wall") return false
            return true
        })
    }

    initByMap(mapMetaData: MapMetaData) {
        const { map, width, height } = mapMetaData
        const mapMatrix: MapMatrix = Array.from({ length: height }, () => Array(width).fill(null))
        const scene = this.scene
        const background = scene.add.renderTexture(0, 0, WINDOW_W, WINDOW_H)
        background.setOrigin(0, 0)

        // Registry players: keyed by manSpriteKey → userId
        const players: RoomPlayer[] = scene.registry.get("players") ?? []
        const myUserId: number = scene.registry.get("userId")
        const playerMap = new Map(players.map(p => [p.manSpriteKey, p.clientId]))

        for (let y = 0; y < map.length; y++) {
            const row = map[y]
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
                        const brick = new BaseObj(scene, { y, x }, "items", 4, "brick")
                        mapMatrix[y][x] = brick
                        this.bricks.push(brick)
                        break
                    }
                    case "man1":
                    case "man2":
                    case "man3":
                    case "man4": {
                        // Only spawn players that are actually in the game
                        const userId = playerMap.get(col)
                        if (userId === undefined) break
                        const m = new ManObj(scene, { y, x }, col, userId)
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
