import { Scene } from "phaser";
import { MapIndex, Position, PressedDir } from "./types";
import {  TILE_WIDTH } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { FireObj } from "./objects/fire";
import { ItemObj } from "./objects/item";
import { PlayerMoveEventPayload, BombExplode, CreateItem, PlayerDie, GenerateBombEvent, RemoveItem } from "./event/events";
import { MapManager } from "./mapManager";
import { tranIndexToPosition } from "./utils";
import { ANIMS } from "./sprite_animations/animations";
import { GameMetaData } from "../store";
import { BrickObj } from "./objects/brick";



export class ObjManager {
    players: ManObj[] = []
    mapManager: MapManager
    bombs: BombObj[] = []
    fires: FireObj[] = []
    ruiningBricks: BrickObj[] = []
    constructor(private scene: Scene, gameMetaData: GameMetaData) {
        this.mapManager = new MapManager(scene, gameMetaData, this.players)
    }
    handleCountdownObjTime(passMs: number) {
        this.fires = this.fires.filter(fire => {
            fire.remainingMs -= passMs
            if (fire.remainingMs <= 0) {
                fire.destroy()
                return false
            }
            return true
        })

        const bombsToExplode: BombObj[] = []
        this.bombs = this.bombs.filter(b => {
            b.remainingMs -= passMs
            if (b.remainingMs <= 0) {
                bombsToExplode.push(b)
                return false
            }
            return true
        })
        for (const b of bombsToExplode) {
            const { indexY, indexX } = b.getMapIndex()
            const tile = this.mapManager.getMapTileByIndex({ indexY, indexX })
            if (tile && tile !== 'wall' && tile.getObjType() === 'bomb') {
                const cells = this.computeExplosionCells({ indexY, indexX }, b.power)
                this.handleBombExplodeEventFromServer({ x: indexX, y: indexY, cells: cells.map(c => ({ x: c.indexX, y: c.indexY })) })
            }
        }
    }

    private computeExplosionCells(origin: MapIndex, power: number): MapIndex[] {
        const cells: MapIndex[] = [{ indexX: origin.indexX, indexY: origin.indexY }]
        const dirs = [{ dy: -1, dx: 0 }, { dy: 1, dx: 0 }, { dy: 0, dx: -1 }, { dy: 0, dx: 1 }]
        for (const { dy, dx } of dirs) {
            for (let i = 1; i <= power; i++) {
                const cell: MapIndex = { indexY: origin.indexY + dy * i, indexX: origin.indexX + dx * i }
                const tileType = this.mapManager.getMapTileTypeByIndex(cell)
                if (tileType === 'wall') break
                cells.push(cell)
                if (tileType === 'brick') break
            }
        }
        return cells
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
        const eventPayloadToServer = {
            manKey: selfManObj.manSpriteKey,
            newX: finalX,
            newY: finalY,
            dir: pressedDir || currDir,
            isMoving: !!pressedDir,
        }
        selfManObj.sprite.setPosition(finalX, finalY)
        selfManObj.setDir(eventPayloadToServer.dir)
        selfManObj.setMoving(eventPayloadToServer.isMoving)
        if (canMove) {
            return eventPayloadToServer
        } else {
            return null
        }
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
        }
        return payload
    }

    ///by server
    handlePlayerMoveEventFromServer(playerMoveEventPayload: PlayerMoveEventPayload) {
        const selfMan = this.players.find(p => p.isSelf)
        if (selfMan) return
        const { newX, newY, dir, isMoving, manKey } = playerMoveEventPayload
        const targetMan = this.players.find(p => p.manSpriteKey === manKey)
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
    handleBombExplodeEventFromServer(payload: BombExplode["payload"]) {
        const originIndex: MapIndex = { indexX: payload.x, indexY: payload.y }
        const bombTile = this.mapManager.getMapTileByIndex(originIndex)
        if (!bombTile || bombTile === "wall" || bombTile.type !== "bomb") return

        const bombObj = bombTile as BombObj
        bombObj.sprite.destroy()
        this.mapManager.cleanMapTileByIndex(originIndex)
        this.bombs = this.bombs.filter(b => {
            const { indexY, indexX } = b.getMapIndex()
            return !(indexY === originIndex.indexY && indexX === originIndex.indexX)
        })
        const bombOwner = this.players.find(p => p.manSpriteKey === bombObj.manSpriteKey)
        if (!bombOwner) {
            return
        }
        bombOwner.usedBombNum = Math.max(0, bombOwner.usedBombNum - 1)
        for (const cell of payload.cells) {
            const cellIndex: MapIndex = { indexX: cell.x, indexY: cell.y }
            const tileType = this.mapManager.getMapTileTypeByIndex(cellIndex)
            const tile = this.mapManager.getMapTileByIndex(cellIndex)
            if (tileType === "brick" && tile && tile !== "wall") {
                const brick = tile as BrickObj
                brick.triggerRuin(i =>
                    this.handleCreateItemEventFromServer({ itemType: "speed", x: i.indexX, y: i.indexY })
                )
                this.ruiningBricks.push(brick)
                this.mapManager.setMapTileByIndex(cellIndex, null)
            }
            if (tileType === "item" && tile && tile !== "wall") {
                tile.sprite.destroy()
                this.mapManager.cleanMapTileByIndex(cellIndex)
            }
            if (tileType === "bomb" && tile && tile !== "wall") {
                const chainBomb = tile as BombObj
                const chainIndex = chainBomb.getMapIndex()
                const chainCells = this.computeExplosionCells(chainIndex, chainBomb.power)
                this.handleBombExplodeEventFromServer({
                    x: chainIndex.indexX,
                    y: chainIndex.indexY,
                    cells: chainCells.map(c => ({ x: c.indexX, y: c.indexY }))
                })
            }
        }

        let up = 0, down = 0, left = 0, right = 0
        for (const cell of payload.cells) {
            if (cell.x === originIndex.indexX && cell.y < originIndex.indexY) up = Math.max(up, originIndex.indexY - cell.y)
            if (cell.x === originIndex.indexX && cell.y > originIndex.indexY) down = Math.max(down, cell.y - originIndex.indexY)
            if (cell.y === originIndex.indexY && cell.x < originIndex.indexX) left = Math.max(left, originIndex.indexX - cell.x)
            if (cell.y === originIndex.indexY && cell.x > originIndex.indexX) right = Math.max(right, cell.x - originIndex.indexX)
        }

        const fire = new FireObj(this.scene, {
            centerX: originIndex.indexX,
            centerY: originIndex.indexY,
            verticalStart: up,
            verticalEnd: down,
            horizontalStart: left,
            horizontalEnd: right,
        })
        console.log(fire,123)
        this.fires.push(fire)
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
        player.sprite.anims.play(ANIMS[payload.manKey].die)
        player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            player.sprite.destroy()
            this.players = this.players.filter(p => p.manSpriteKey !== payload.manKey)
        })
    }
}
