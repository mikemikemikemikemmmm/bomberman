import { Scene } from "phaser";
import { MapIndex, Position, PressedDir } from "./types";
import { TILE_WIDTH } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { FireObj, FireObjConfig } from "./objects/fire";
import { ItemObj } from "./objects/item";
import { PlayerMoveEventPayload, BombExplode, CreateItem, PlayerDie, GenerateBombEvent, RemoveItem, ItemType } from "./event/events";
import { MapManager } from "./mapManager";
import { tranIndexToPosition } from "./utils";
import { ANIMS } from "./sprite_animations/animations";
import { BrickObj } from "./objects/brick";


interface ExplodeData {
    explodeBombs: BombObj[],
    ruinBricks: BrickObj[],
    destroyItems: ItemObj[],
    showFireConfigs: FireObjConfig[]
}
export class ObjManager {
    players: ManObj[] = []
    mapManager: MapManager
    bombs: BombObj[] = []
    fires: FireObj[] = []
    ruiningBricks: BrickObj[] = []
    constructor(private scene: Scene) {
        this.mapManager = new MapManager(scene, this.players)
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
        const readyExplodeBombData = this.handleGetExplodeBombData(passMs)
        this.handleRenderExplodeByData(readyExplodeBombData)
    }
    handleRenderExplodeByData(explodeData: ExplodeData) {
        for (const fc of explodeData.showFireConfigs) {
            const fireObj = new FireObj(this.scene, fc)
            this.fires.push(fireObj)
        }
        for (const b of explodeData.explodeBombs) {
            b.sprite.destroy()
            this.mapManager.cleanMapTileByIndex(b.getMapIndex())
        }
        for (const brick of explodeData.ruinBricks) {
            const brickIndex = brick.getMapIndex()
            this.mapManager.setMapTileByIndex(brickIndex, null)
            brick.triggerRuin(i => {
                const randomInt = Math.floor(Math.random() * 5)
                const items = ["speed", "moreBomb", "fire"] as ItemType[]
                if (randomInt <= 2) {
                    const index = Math.floor(Math.random() * items.length)
                    this.handleCreateItemEvent({ itemType: items[index], x: i.indexX, y: i.indexY })
                }
            })
            this.ruiningBricks.push(brick)
        }
        for (const item of explodeData.destroyItems) {
            const itemIndex = item.getMapIndex()
            item.sprite.destroy()
            this.mapManager.cleanMapTileByIndex(itemIndex)
        }
    }
    handleGetExplodeBombData(passMs: number): ExplodeData {
        const result: ExplodeData = {
            explodeBombs: [],
            ruinBricks: [],
            destroyItems: [],
            showFireConfigs: []
        }

        // Countdown bombs and collect expired ones
        this.bombs = this.bombs.filter(b => {
            b.remainingMs -= passMs
            if (b.remainingMs <= 0) {
                result.explodeBombs.push(b)
                return false
            }
            return true
        })

        const processedBombs = new Set<BombObj>()
        const toProcess = [...result.explodeBombs]

        while (toProcess.length > 0) {
            const b = toProcess.shift()!
            if (processedBombs.has(b)) continue
            processedBombs.add(b)

            const { indexX, indexY } = b.getMapIndex()
            const { power } = b

            const owner = this.players.find(p => p.manSpriteKey === b.manSpriteKey)
            if (owner) owner.usedBombNum = Math.max(0, owner.usedBombNum - 1)

            const fourDirs: [number, number, 'up' | 'down' | 'left' | 'right'][] = [
                [0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']
            ]
            let up = 0, down = 0, left = 0, right = 0

            for (const [dx, dy, dirName] of fourDirs) {
                for (let i = 1; i <= power; i++) {
                    const targetIndex = { indexX: indexX + dx * i, indexY: indexY + dy * i }
                    const tileType = this.mapManager.getMapTileTypeByIndex(targetIndex)

                    if (tileType === 'wall') break

                    if (tileType === 'brick') {
                        const brick = this.mapManager.getMapTileByIndex(targetIndex) as BrickObj
                        if (!brick.isRuining && !result.ruinBricks.includes(brick)) {
                            result.ruinBricks.push(brick)
                        }
                        if (dirName === 'up') up = Math.max(up, i)
                        else if (dirName === 'down') down = Math.max(down, i)
                        else if (dirName === 'left') left = Math.max(left, i)
                        else right = Math.max(right, i)
                        break
                    }

                    if (tileType === 'item') {
                        const item = this.mapManager.getMapTileByIndex(targetIndex) as ItemObj
                        if (!result.destroyItems.includes(item)) result.destroyItems.push(item)
                        if (dirName === 'up') up = Math.max(up, i)
                        else if (dirName === 'down') down = Math.max(down, i)
                        else if (dirName === 'left') left = Math.max(left, i)
                        else right = Math.max(right, i)
                        break
                    }

                    if (tileType === 'bomb') {
                        const chainBomb = this.mapManager.getMapTileByIndex(targetIndex) as BombObj
                        if (!processedBombs.has(chainBomb) && !toProcess.includes(chainBomb)) {
                            result.explodeBombs.push(chainBomb)
                            toProcess.push(chainBomb)
                            this.bombs = this.bombs.filter(bb => bb !== chainBomb)
                        }
                        if (dirName === 'up') up = Math.max(up, i)
                        else if (dirName === 'down') down = Math.max(down, i)
                        else if (dirName === 'left') left = Math.max(left, i)
                        else right = Math.max(right, i)
                        break
                    }

                    // empty — fire passes through
                    if (dirName === 'up') up = Math.max(up, i)
                    else if (dirName === 'down') down = Math.max(down, i)
                    else if (dirName === 'left') left = Math.max(left, i)
                    else right = Math.max(right, i)
                }
            }

            const fireConfig = {
                centerX: indexX,
                centerY: indexY,
                verticalStart: up,
                verticalEnd: down,
                horizontalStart: left,
                horizontalEnd: right,
            }
            result.showFireConfigs.push(fireConfig)
        }

        return result
    }
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

    handlePlaceBomb(playerObj: ManObj) {
        if (playerObj.usedBombNum >= playerObj.bombNum) {
            return null
        }
        const bombIndex = playerObj.getCenterMapIndex()
        const mapTileType = this.mapManager.getMapTileTypeByIndex(bombIndex)
        if (mapTileType === "bomb" || mapTileType === "brick" || mapTileType === "wall") return null
        if (mapTileType === 'item') {
            const target = this.mapManager.getMapTileByIndex(bombIndex) as ItemObj
            target.sprite.destroy()
            this.mapManager.cleanMapTileByIndex(bombIndex)
        }
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


    handleCreateItemEvent(payload: CreateItem["payload"]) {
        const index: MapIndex = { indexX: payload.x, indexY: payload.y }
        const item = new ItemObj(this.scene, index, payload.itemType)
        this.mapManager.setMapTileByIndex(index, item)
    }

    checkPlayerDie() {
        for (const player of this.players) {
            if (!player.isAlive) continue
            const playerIndex = player.getCenterMapIndex()
            const inFire = this.fires.some(fire => {
                const allSprites = [fire.centerSprite, ...fire.verticalSprites, ...fire.horizontalSprites]
                return allSprites.some(sprite => {
                    return sprite.x / TILE_WIDTH === playerIndex.indexX && sprite.y / TILE_WIDTH === playerIndex.indexY
                })
            })
            if (inFire) {
                player.isAlive = false
                player.sprite.anims.play(ANIMS[player.manSpriteKey].die)
                player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                    player.sprite.destroy()
                    this.players = this.players.filter(p => p !== player)
                })
            }
        }
    }
    checkPlayerEatItem() {
        for (const player of this.players) {
            if (!player.isAlive) continue
            const playerIndex = player.getCenterMapIndex()
            const tile = this.mapManager.getMapTileByIndex(playerIndex)
            if (!tile || tile === 'wall' || tile.getObjType() !== 'item') continue
            const item = tile as ItemObj
            this.mapManager.cleanMapTileByIndex(playerIndex)
            item.sprite.destroy()
            player.eatItem(item.itemType)
        }
    }
    ///by server
    // handlePlayerMoveEvent(playerMoveEventPayload: PlayerMoveEventPayload) {
    //     const selfMan = this.players.find(p => p.isSelf)
    //     if (selfMan) return
    //     const { newX, newY, dir, isMoving, manKey } = playerMoveEventPayload
    //     const targetMan = this.players.find(p => p.manSpriteKey === manKey)
    //     if (!targetMan) {
    //         return
    //     }
    //     targetMan.sprite.setPosition(newX, newY)
    //     targetMan.setDir(dir)
    //     targetMan.setMoving(isMoving)
    // }
    // handleGenerateBombEvent(payload: GenerateBombEvent["payload"]) {
    //     const index: MapIndex = { indexX: payload.x, indexY: payload.y }
    //     const targetTileType = this.mapManager.getMapTileTypeByIndex(index)
    //     if (targetTileType === "empty" || targetTileType === "item") {
    //         const bomb = new BombObj(this.scene, index, payload.bombPower, payload.manSpriteKey)
    //         this.mapManager.setMapTileByIndex(index, bomb)
    //         this.bombs.push(bomb)
    //     }
    // }

    // handleRemoveItemEvent(payload: RemoveItem["payload"]) {
    //     const index: MapIndex = { indexX: payload.x, indexY: payload.y }
    //     const tile = this.mapManager.getMapTileByIndex(index)
    //     if (tile && tile !== "wall" && tile.type === "item") {
    //         tile.sprite.destroy()
    //         this.mapManager.cleanMapTileByIndex(index)
    //     }
    // }

    // handlePlayerDieEvent(payload: PlayerDie["payload"][number]) {
    //     const player = this.players.find(p => p.manSpriteKey === payload.manKey)
    //     if (!player) return
    //     player.sprite.anims.play(ANIMS[payload.manKey].die)
    //     player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    //         player.sprite.destroy()
    //         this.players = this.players.filter(p => p.manSpriteKey !== payload.manKey)
    //     })
    // }
}
