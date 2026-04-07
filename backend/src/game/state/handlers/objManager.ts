import { Scene } from "phaser";
import { MapMetaData, Position, PressedDir } from "./types";
import { TILE_WIDTH } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { BaseObj } from "./objects/base";
import { PlayerMoveEvent, PlayerMoveEventPayload } from "./event/events";
import { wsEmitter } from "../websocket";
import { MapManager } from "./mapManager";
import { ManSpriteKey } from "./sprite_animations/sprite";
import { tranIndexToPosition } from "./utils";

export class ObjManager {
    players: ManObj[] = []
    bombs: BombObj[] = []
    staticItems: BaseObj[] = []
    mapManager: MapManager
    scene: Scene
    selfSpriteKey: ManSpriteKey

    constructor(scene: Scene, mapMeta: MapMetaData) {
        this.scene = scene
        this.mapManager = new MapManager(mapMeta, scene, this.players)
        // bricks array is owned by mapManager and shared here for convenience
    }

    get bricks(): BaseObj[] {
        return this.mapManager.bricks
    }

    handlePlayerMoveEvent(playerMoveEventPayload: PlayerMoveEventPayload, userId: number) {
        const selfMan = this.players.find(p => p.userId === userId)
        if (!selfMan) return
        const { newX, newY, dir, isMoving } = playerMoveEventPayload
        selfMan.sprite.setPosition(newX, newY)
        selfMan.dir = dir
        const animKey = `${selfMan.manSpriteKey}_${dir}`
        selfMan.sprite.anims.play(animKey, true)
        selfMan.isMoving = isMoving
        if (!isMoving) {
            selfMan.sprite.anims.pause()
        } else {
            selfMan.sprite.anims.resume()
        }
    }

    handlePositionChange(time: number, playerObj: ManObj, pressedDir: PressedDir) {
        const speed = 12
        const prevX = playerObj.sprite.x
        const prevY = playerObj.sprite.y
        const currDir = playerObj.dir
        let targetX = prevX
        let targetY = prevY
        if (pressedDir === "up")    targetY -= speed
        if (pressedDir === "down")  targetY += speed
        if (pressedDir === "left")  targetX -= speed
        if (pressedDir === "right") targetX += speed

        let canMove = this.mapManager.canManMoveByPosition({ x: targetX, y: targetY }, playerObj)
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
                    canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, playerObj)
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
                    canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, playerObj)
                }
            }

            if (!canMove) {
                if (pressedDir === "up")    finalY = Math.ceil(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "down")  finalY = Math.floor(targetY / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "left")  finalX = Math.ceil(targetX / TILE_WIDTH) * TILE_WIDTH
                else if (pressedDir === "right") finalX = Math.floor(targetX / TILE_WIDTH) * TILE_WIDTH
                canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY }, playerObj)
            }
        }

        this.handleCanPassBomb(playerObj, { y: finalY, x: finalX })
        const userId = this.scene.registry.get("userId")
        const event: PlayerMoveEvent = {
            type: "playerMove",
            payload: {
                userId,
                manKey: playerObj.manSpriteKey,
                newX: finalX,
                newY: finalY,
                dir: pressedDir || currDir,
                isMoving: !!pressedDir,
            }
        }
        this.handlePlayerMoveEvent(event.payload, userId)
        if (canMove && (event.payload.newX !== playerObj.sprite.x || event.payload.newY !== playerObj.sprite.y)) {
            wsEmitter.sendEventToServer("playerMove", event.payload as never)
        }
    }

    handleCanPassBomb(manObj: ManObj, finalManPos: Position) {
        manObj.canPassBombPosList = manObj.canPassBombPosList.filter(bombP => {
            const dx = Math.abs(bombP.x - finalManPos.x)
            const dy = Math.abs(bombP.y - finalManPos.y)
            return dx < TILE_WIDTH && dy < TILE_WIDTH
        })
    }

    handlePlaceBomb(_time: number, playerObj: ManObj) {
        const bombIndex = playerObj.getCenterMapIndex()
        const mapTileType = this.mapManager.getMapTileTypeByIndex(bombIndex)
        if (mapTileType === "bomb" || mapTileType === "brick" || mapTileType === "wall") return
        const newBomb = new BombObj(this.scene, bombIndex, playerObj.bombPower)
        this.mapManager.setMapTileByIndex(bombIndex, newBomb)
        this.bombs.push(newBomb)
        const pos = tranIndexToPosition(bombIndex)
        playerObj.canPassBombPosList.push(pos)

        wsEmitter.sendEventToServer("generateBomb", {
            manKey: playerObj.manSpriteKey,
            x: bombIndex.x,
            y: bombIndex.y,
            bombPower: playerObj.bombPower,
        } as never)
    }
}
