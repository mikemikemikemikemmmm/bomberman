import { Scene } from "phaser";
import { MapIndex, Position, PressedDir } from "./types";
import { TILE_WIDTH } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { FireObj, FireObjConfig } from "./objects/fire";
import { ItemObj } from "./objects/item";
import { PlayerMoveEventPayload, BombExplode, CreateItem, PlayerDie, GenerateBombEvent, RemoveItem, PlayerGetItemEvent, ItemType } from "./event/events";
import { MapManager } from "./mapManager";
import { tranIndexToPosition } from "./utils";
import { ANIMS } from "./sprite_animations/animations";
import { GameMetaData, useGlobalStore } from "../store";
import { BrickObj } from "./objects/brick";
import { SendSelfPlayerMovePayload } from "../websocket/eventMap";



// interface ExplodeData {
//     explodeBombs: BombObj[],
//     ruinBricks: BrickObj[],
//     destroyItems: ItemObj[],
//     showFireConfigs: FireObjConfig[]
// }
export class ObjManager {
    players: ManObj[] = []
    mapManager: MapManager
    bombs: BombObj[] = []
    fires: FireObj[] = []
    ruiningBricks: BrickObj[] = []
    constructor(private scene: Scene, gameMetaData: GameMetaData) {
        this.mapManager = new MapManager(scene, gameMetaData, this.players)
    }
    ///by self
    handleSelfPositionChange(selfManObj: ManObj, pressedDir: PressedDir) {
        const speed = selfManObj.speed
        const prevX = selfManObj.sprite.x
        const prevY = selfManObj.sprite.y
        const currDir = selfManObj.dir
        let targetX = prevX
        let targetY = prevY
        if (pressedDir === "up") targetY -= speed
        if (pressedDir === "down") targetY += speed
        if (pressedDir === "left") targetX -= speed
        if (pressedDir === "right") targetX += speed

        let canMove = this.mapManager.canManMoveByPosition({ posX: targetX, posY: targetY }, selfManObj)
        let finalX = targetX
        let finalY = targetY
        if (!canMove) {
            const threshold = speed
            if (pressedDir === "left" || pressedDir === "right") {
                const offset = prevY % TILE_WIDTH
                if (offset !== 0) {
                    if (offset <= threshold) {
                        finalY = prevY - offset
                        finalX = targetX
                    } else if (TILE_WIDTH - offset <= threshold) {
                        finalY = prevY + (TILE_WIDTH - offset)
                        finalX = targetX
                    }
                    canMove = this.mapManager.canManMoveByPosition({ posX: finalX, posY: finalY }, selfManObj)
                }
            } else if (pressedDir === "up" || pressedDir === "down") {

                const offset = prevX % TILE_WIDTH
                if (offset !== 0) {
                    if (offset <= threshold) {
                        finalX = prevX - offset
                        finalY = targetY
                    } else if (TILE_WIDTH - offset <= threshold) {
                        finalX = prevX + (TILE_WIDTH - offset)
                        finalY = targetY
                    }
                    canMove = this.mapManager.canManMoveByPosition({ posX: finalX, posY: finalY }, selfManObj)
                }
            }

            if (!canMove) {
                if (pressedDir === "up") finalY = Math.ceil(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "down") finalY = Math.floor(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "left") finalX = Math.ceil(targetX / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "right") finalX = Math.floor(targetX / TILE_WIDTH) * TILE_WIDTH
                canMove = this.mapManager.canManMoveByPosition({ posX: finalX, posY: finalY }, selfManObj)
            }
        }

        this.handleCanPassBomb(selfManObj, { posY: finalY, posX: finalX })
        const finalDir = pressedDir || currDir
        const finalMoving = !!pressedDir
        // selfManObj.setDir(finalDir)
        // selfManObj.setMoving(finalMoving)
        const eventPayloadToServer = {
            manKey: selfManObj.manSpriteKey,
            dir: finalDir,
            isMoving: finalMoving,
            userId: useGlobalStore.getState().userId,
            newX: canMove ? finalX : prevX,
            newY: canMove ? finalX : prevY,
        } as SendSelfPlayerMovePayload
        // if (canMove) {
        //     eventPayloadToServer.newX = finalX
        //     eventPayloadToServer.newY = finalY
        //     // selfManObj.sprite.setPosition(finalX, finalY)
        // }
        return eventPayloadToServer
    }

    handleCanPassBomb(manObj: ManObj, finalManPos: Position) {
        manObj.canPassBombPosList = manObj.canPassBombPosList.filter(bombP => {
            const dx = Math.abs(bombP.posX - finalManPos.posX)
            const dy = Math.abs(bombP.posY - finalManPos.posY)
            return dx < TILE_WIDTH && dy < TILE_WIDTH
        })
    }

    handleSelfPlaceBomb(playerObj: ManObj) {
        if (playerObj.usedBombNum >= playerObj.bombNum) {
            return null
        }
        const bombIndex = playerObj.getCenterMapIndex()
        const mapTileType = this.mapManager.getMapTileTypeByIndex(bombIndex)
        if (mapTileType === "bomb" || mapTileType === "brick" || mapTileType === "wall") return null
        const newBomb = new BombObj(this.scene, bombIndex, playerObj.bombPower, playerObj.manSpriteKey)
        this.mapManager.setMapTileByIndex(bombIndex, newBomb)
        this.bombs.push(newBomb)
        const pos = tranIndexToPosition(bombIndex)
        playerObj.canPassBombPosList.push(pos)
        playerObj.usedBombNum++
        const payload = {
            manKey: playerObj.manSpriteKey,
            x: bombIndex.indexX,
            y: bombIndex.indexY,
            bombPower: playerObj.bombPower,
            userId: useGlobalStore.getState().userId as number
        }
        return payload
    }

    ///by server
    handlePlayerMoveEventFromServer(playerMoveEventPayload: PlayerMoveEventPayload) {
        // const selfMan = this.players.find(p => p.isSelf)
        // console.log(selfMan, 2222222222)
        // if (selfMan) return
        const { newX, newY, dir, isMoving, manKey } = playerMoveEventPayload
        const targetMan = this.players.find(p => p.manSpriteKey === manKey)
        console.log(playerMoveEventPayload, 2222222222)
        if (!targetMan) {
            return
        }
        targetMan.sprite.setPosition(newX, newY)
        targetMan.setDir(dir)
        targetMan.setMoving(isMoving)
    }
    handleGenerateBombEventFromServer(payload: GenerateBombEvent["payload"]) {
        const index: MapIndex = { indexX: payload.x, indexY: payload.y }
        const targetTileType = this.mapManager.getMapTileTypeByIndex(index)
        if (targetTileType === "empty" || targetTileType === "item") {
            const bomb = new BombObj(this.scene, index, payload.bombPower, payload.manSpriteKey)
            this.mapManager.setMapTileByIndex(index, bomb)
            this.bombs.push(bomb)
        }
    }
    handleCreateItemEventFromServer(payload: CreateItem["payload"]) {
        const index: MapIndex = { indexX: payload.x, indexY: payload.y }
        const item = new ItemObj(this.scene, index, payload.itemType)
        this.mapManager.setMapTileByIndex(index, item)
    }

    handleRemoveItemEventFromServer(payload: RemoveItem["payload"]) {
        const index: MapIndex = { indexX: payload.x, indexY: payload.y }
        const tile = this.mapManager.getMapTileByIndex(index)
        if (tile && tile !== "wall" && tile.type === "item") {
            tile.sprite.destroy()
            this.mapManager.cleanMapTileByIndex(index)
        }
    }

    handlePlayerDieEventFromServer(payload: PlayerDie["payload"][number]) {
        const player = this.players.find(p => p.manSpriteKey === payload.manKey)
        if (!player) return
        player.die()
    }
    handleReomoveFireEventFromServer(payload: { x: number; y: number }) {
        this.fires = this.fires.filter(fire => {
            const cx = fire.centerSprite.x / TILE_WIDTH
            const cy = fire.centerSprite.y / TILE_WIDTH
            if (cx === payload.x && cy === payload.y) {
                fire.destroy()
                return false
            }
            return true
        })
    }
    handleBombExplodeEventFromServer(payload: BombExplode["payload"]) {
        const originIndex: MapIndex = { indexX: payload.x, indexY: payload.y }
        const bombTile = this.mapManager.getMapTileByIndex(originIndex)
        if (bombTile && bombTile !== "wall" && bombTile.type === "bomb") {
            const bombObj = bombTile as BombObj
            const bombOwner = this.players.find(p => p.manSpriteKey === bombObj.manSpriteKey)
            if (bombOwner) bombOwner.usedBombNum = Math.max(0, bombOwner.usedBombNum - 1)
            bombObj.sprite.destroy()
            this.mapManager.cleanMapTileByIndex(originIndex)
            this.bombs = this.bombs.filter(b => {
                const { indexX, indexY } = b.getMapIndex()
                return !(indexX === originIndex.indexX && indexY === originIndex.indexY)
            })
        }

        // Destroy bricks in fire cells (items are handled server-side via createItem/removeItem)
        for (const cell of payload.cells) {
            const cellIndex: MapIndex = { indexX: cell.x, indexY: cell.y }
            const tileType = this.mapManager.getMapTileTypeByIndex(cellIndex)
            const tile = this.mapManager.getMapTileByIndex(cellIndex)
            if (tileType === "brick" && tile && tile !== "wall") {
                const brick = tile as BrickObj
                brick.triggerRuin(() => { })
                this.ruiningBricks.push(brick)
                this.mapManager.setMapTileByIndex(cellIndex, null)
            }
        }

        // Create fire visual by reconstructing spread distances from cells
        const { x, y, cells } = payload
        let up = 0, down = 0, left = 0, right = 0
        for (const cell of cells) {
            if (cell.x === x && cell.y < y) up = Math.max(up, y - cell.y)
            if (cell.x === x && cell.y > y) down = Math.max(down, cell.y - y)
            if (cell.y === y && cell.x < x) left = Math.max(left, x - cell.x)
            if (cell.y === y && cell.x > x) right = Math.max(right, cell.x - x)
        }
        const fire = new FireObj(this.scene, {
            centerX: x, centerY: y,
            verticalStart: up, verticalEnd: down,
            horizontalStart: left, horizontalEnd: right,
        })
        this.fires.push(fire)
    }

    handlePlayerGetItemEventFromServer(payload: PlayerGetItemEvent["payload"]) {
        const player = this.players.find(p => p.manSpriteKey === payload.manKey)
        if (!player) return
        player.eatItem(payload.itemType as ItemType)
    }


}
