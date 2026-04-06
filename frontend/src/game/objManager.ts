import { Scene } from "phaser";
import { CountdownMapIndex, MapIndex, MapMatrix, OriginMapMatrix, Position, PressedDir } from "./types";
import { COINTDOWN_MS, TILE_WIDTH } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { FireObj } from "./objects/fire";
import { ItemObj } from "./objects/item";
import { PlayerMoveEventPayload, BombExplode, CreateItem, PlayerDie, GenerateBombEvent, RemoveItem, PlayerGetItemEvent } from "./event/events";
import { wsEmitter } from "../websocket";
import { MapManager } from "./mapManager";
import { ManSpriteKey } from "./sprite_animations/sprite";
import { tranIndexToPosition } from "./utils";
import { ANIMS } from "./sprite_animations/animations";
import { GameMetaData } from "../store";

const BASE_SPEED = 10


export class ObjManager {
    players: ManObj[] = []
    selfSpriteKey: ManSpriteKey
    selfActiveBombNum: number = 0
    mapManager: MapManager
    bombIndexs: CountdownMapIndex[] = []
    fireObjs: FireObj[] = []
    ruiningBrickIndexs: CountdownMapIndex[] = []
    constructor(private scene: Scene, gameMetaData: GameMetaData) {
        this.mapManager = new MapManager(scene, gameMetaData, this.players)
    }
    handleCountdownObjTime(passMs: number) {
        this.fireObjs = this.fireObjs.filter(fire => {
            fire.remainingMs -= passMs
            if (fire.remainingMs <= 0) {
                fire.destroy()
                return false
            }
            return true
        })

        this.bombIndexs = this.bombIndexs.filter(b => {
            b.remainingMs -= passMs
            if (b.remainingMs <= 0) {
                const tile = this.mapManager.getMapTileByIndex(b)
                if (tile && tile !== 'wall' && tile.getObjType() === 'bomb') {
                    const bombObj = tile as BombObj
                    const cells = this.computeExplosionCells(b, bombObj.power)
                    const manSpriteKey = b.manSpriteKey ?? this.selfSpriteKey
                    this.handleBombExplodeEventFromServer({ x: b.x, y: b.y, manSpriteKey, cells })
                }
                return false
            }
            return true
        })

        this.ruiningBrickIndexs = this.ruiningBrickIndexs.filter(brick => {
            brick.remainingMs -= passMs
            if (brick.remainingMs <= 0) {
                const tile = this.mapManager.getMapTileByIndex(brick)
                if (tile && tile !== 'wall') {
                    tile.sprite.destroy()
                    this.mapManager.cleanMapTileByIndex(brick)
                }
                return false
            }
            return true
        })
    }

    private computeExplosionCells(origin: MapIndex, power: number): MapIndex[] {
        const cells: MapIndex[] = [{ x: origin.x, y: origin.y }]
        const dirs = [{ dy: -1, dx: 0 }, { dy: 1, dx: 0 }, { dy: 0, dx: -1 }, { dy: 0, dx: 1 }]
        for (const { dy, dx } of dirs) {
            for (let i = 1; i <= power; i++) {
                const cell = { y: origin.y + dy * i, x: origin.x + dx * i }
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
        const speed = BASE_SPEED * selfManObj.speed
        const prevX = selfManObj.sprite.x
        const prevY = selfManObj.sprite.y
        const currDir = selfManObj.dir
        let targetX = prevX
        let targetY = prevY
        if (pressedDir === "up") targetY -= speed
        if (pressedDir === "down") targetY += speed
        if (pressedDir === "left") targetX -= speed
        if (pressedDir === "right") targetX += speed

        let canMove = this.mapManager.canManMoveByPosition({ x: targetX, y: targetY }, selfManObj)
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
                    canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, selfManObj)
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
                    canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, selfManObj)
                }
            }

            if (!canMove) {
                if (pressedDir === "up") finalY = Math.ceil(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "down") finalY = Math.floor(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "left") finalX = Math.ceil(targetX / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "right") finalX = Math.floor(targetX / TILE_WIDTH) * TILE_WIDTH
                canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, selfManObj)
            }
        }

        this.handleCanPassBomb(selfManObj, { y: finalY, x: finalX })
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
            const dx = Math.abs(bombP.x - finalManPos.x)
            const dy = Math.abs(bombP.y - finalManPos.y)
            return dx < TILE_WIDTH && dy < TILE_WIDTH
        })
    }

    handleSelfPlaceBomb(selfPlayerObj: ManObj) {
        if (this.selfActiveBombNum >= selfPlayerObj.bombNum) return null
        const bombIndex = selfPlayerObj.getCenterMapIndex()
        const mapTileType = this.mapManager.getMapTileTypeByIndex(bombIndex)
        if (mapTileType === "bomb" || mapTileType === "brick" || mapTileType === "wall") return null
        const newBomb = new BombObj(this.scene, bombIndex, selfPlayerObj.bombPower)
        this.mapManager.setMapTileByIndex(bombIndex, newBomb)
        this.bombIndexs.push({ y: bombIndex.y, x: bombIndex.x, remainingMs: COINTDOWN_MS.bomb, manSpriteKey: selfPlayerObj.manSpriteKey })
        const pos = tranIndexToPosition(bombIndex)
        selfPlayerObj.canPassBombPosList.push(pos)
        this.selfActiveBombNum++
        const payload = {
            manKey: selfPlayerObj.manSpriteKey,
            x: bombIndex.x,
            y: bombIndex.y,
            bombPower: selfPlayerObj.bombPower,
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
        const index = { x: payload.x, y: payload.y }
        const targetTileType = this.mapManager.getMapTileTypeByIndex(index)
        if (targetTileType === "empty" || targetTileType === "item") {
            const bomb = new BombObj(this.scene, index, payload.bombPower)
            this.mapManager.setMapTileByIndex(index, bomb)
            this.bombIndexs.push({ y: index.y, x: index.x, remainingMs: COINTDOWN_MS.bomb })
        }
    }

    handleBombExplodeEventFromServer(payload: BombExplode["payload"]) {
        const originIndex = { x: payload.x, y: payload.y }
        const bombTile = this.mapManager.getMapTileByIndex(originIndex)
        if (!bombTile || bombTile === "wall" || bombTile.type !== "bomb") return

        this.mapManager.setMapTileByIndex(originIndex, null)
        this.bombIndexs = this.bombIndexs.filter(
            b => !(b.x === originIndex.x && b.y === originIndex.y)
        )

        if (payload.manSpriteKey === this.selfSpriteKey) {
            this.selfActiveBombNum = Math.max(0, this.selfActiveBombNum - 1)
        }

        for (const cell of payload.cells) {
            const tileType = this.mapManager.getMapTileTypeByIndex(cell)
            const tile = this.mapManager.getMapTileByIndex(cell)

            if (tileType === "brick" && tile && tile !== "wall") {
                tile.sprite.destroy()
                this.mapManager.setMapTileByIndex(cell, null)
                this.mapManager.brickIndexs = this.mapManager.brickIndexs.filter(
                    b => !(b.x === cell.x && b.y === cell.y)
                )
            }

            const fire = new FireObj(this.scene, cell)
            this.mapManager.setMapTileByIndex(cell, fire)
            this.mapManager.fireIndexs.push(cell)
            this.scene.time.delayedCall(1000, () => {
                fire.sprite.destroy()
                if (this.mapManager.getMapTileTypeByIndex(cell) === "fire") {
                    this.mapManager.setMapTileByIndex(cell, null)
                }
                this.mapManager.fireIndexs = this.mapManager.fireIndexs.filter(
                    f => !(f.x === cell.x && f.y === cell.y)
                )
            })
        }
    }

    handleCreateItemEventFromServer(payload: CreateItem["payload"]) {
        const index = { x: payload.x, y: payload.y }
        const item = new ItemObj(this.scene, index, payload.itemType)
        this.mapManager.setMapTileByIndex(index, item)
    }

    handleRemoveItemEventFromServer(payload: ItemEatenPayload) {
        const index = { x: payload.x, y: payload.y }
        this.mapManager.cleanMapTileByIndex(index)
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
