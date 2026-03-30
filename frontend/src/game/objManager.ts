import { Scene } from "phaser";
import {  MapIndex, MapMetaData, MapTile, Position, PressedDir } from "./types";
import { TILE_WIDTH, WINDOW_H, WINDOW_W } from "./gameConfig";
import { ManObj } from "./objects/man";
import { BombObj } from "./objects/bomb";
import { PlayerMoveEvent, PlayerMoveEventPayload } from "./event/events";
import { wsEmitter } from "../websocket";
import { MapManager } from "./mapManager";
import { ManSpriteKey } from "./sprite_animations/sprite";
import { tranIndexToPosition, tranPositionToIndex } from "./utils";

export class ObjManager {
    players: ManObj[] = []
    mapManager:MapManager
    scene: Scene
    selfSpriteKey :ManSpriteKey
    constructor(scene: Scene, mapMeta: MapMetaData) {
        this.scene = scene
        this.mapManager =new MapManager(mapMeta,scene,this.players)
    }
    handlePlayerMoveEvent(playerMoveEventPayload: PlayerMoveEventPayload, userId: number) {
        const selfMan = this.players.find(p => p.userId === userId)
        if (!selfMan) {
            return
        }
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
    handlePositionChange(time: number, playerObj: ManObj,pressedDir:PressedDir){
        const speed = 12;
        const prevX = playerObj.sprite.x;
        const prevY = playerObj.sprite.y;
        const currDir = playerObj.dir;

        // 1. 計算預期移動後的位置
        let targetX = prevX;
        let targetY = prevY;
        if (pressedDir === "up") targetY -= speed;
        if (pressedDir === "down") targetY += speed;
        if (pressedDir === "left") targetX -= speed;
        if (pressedDir === "right") targetX += speed;
        // 2. 檢測預期位置是否可移動
        let canMove = this.mapManager.canManMoveByPosition({ x: targetX, y: targetY },playerObj);
        let finalX = targetX;
        let finalY = targetY;
     if (!canMove) {
        // --- 轉彎校正：當你想左右走但 Y 沒對齊，或想上下走但 X 沒對齊 ---
        // 容錯範圍建議設為 speed (6)，表示只要差 6 像素以內就自動幫你對齊
        const threshold = speed; 

        if (pressedDir === "left" || pressedDir === "right") {
            const offset = prevY % TILE_WIDTH;
            if (offset !== 0) {
                if (offset <= threshold) {
                    // 向上校正對齊 (例如 23 -> 20)
                    finalY = prevY - offset;
                    finalX = targetX;
                } else if (TILE_WIDTH - offset <= threshold) {
                    // 向下校正對齊 (例如 37 -> 40)
                    finalY = prevY + (TILE_WIDTH - offset);
                    finalX = targetX;
                }
                // 校正後重新檢查
                canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY },playerObj);
            }
        } 
        else if (pressedDir === "up" || pressedDir === "down") {
            const offset = prevX % TILE_WIDTH;
            if (offset !== 0) {
                if (offset <= threshold) {
                    // 向左校正 (例如 23 -> 20)
                    finalX = prevX - offset;
                    finalY = targetY;
                } else if (TILE_WIDTH - offset <= threshold) {
                    // 向右校正 (例如 37 -> 40)
                    finalX = prevX + (TILE_WIDTH - offset);
                    finalY = targetY;
                }
                canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY },playerObj);
            }
        }

        // --- 牆壁貼齊：如果校正後還是撞牆，執行原本的 Math.ceil/floor 貼邊 ---
        if (!canMove) {
            if (pressedDir === "up") finalY = Math.ceil(targetY / TILE_WIDTH) * TILE_WIDTH;
            else if (pressedDir === "down") finalY = Math.floor(targetY / TILE_WIDTH) * TILE_WIDTH;
            else if (pressedDir === "left") finalX = Math.ceil(targetX / TILE_WIDTH) * TILE_WIDTH;
            else if (pressedDir === "right") finalX = Math.floor(targetX / TILE_WIDTH) * TILE_WIDTH;
            
            canMove = this.mapManager.canManMoveByPosition({ x: finalX, y: finalY },playerObj);
        }
    }
        // 4. 更新與發送事件
        this.handleCanPassBomb(playerObj,{y:finalY,x:finalX})
        const userId =this.scene.registry.get("userId")
        const event: PlayerMoveEvent = {
            type: "playerMove",
            payload: {
                userId ,
                manKey: playerObj.manSpriteKey,
                newX:  finalX ,
                newY:  finalY,
                dir: pressedDir || currDir,
                isMoving: !!pressedDir,
            }
        }
        this.handlePlayerMoveEvent(event.payload, userId);
        // 即使是修正後的位置，只要有位移就送出
        if (canMove && (event.payload.newX !== playerObj.sprite.x || event.payload.newY !== playerObj.sprite.y)) {
            wsEmitter.sendEventToServer("playerMove", event.payload as never);
            // this.lastMoveTime = time; // 更新移動時間
        }
    }
   handleCanPassBomb(manObj: ManObj, finalManPos: Position) {
        console.log(manObj.canPassBombPosList, "canPassBombPosList");
        const newList = manObj.canPassBombPosList.filter(bombP => {
            const dx = Math.abs(bombP.x - finalManPos.x);
            const dy = Math.abs(bombP.y - finalManPos.y);
            // 只保留水平或垂直距離小於 TILE_WIDTH 的
            return dx < TILE_WIDTH && dy < TILE_WIDTH;
        });

        manObj.canPassBombPosList = newList;
        }
    handlePlaceBomb(time: number, playerObj: ManObj){
        const BombIndex = playerObj.getCenterMapIndex()
        const mapTileType = this.mapManager.getMapTileTypeByIndex(BombIndex)
        if(mapTileType === "bomb"|| mapTileType === "brick" || mapTileType==="wall"){
            return
        }
        const newBomb =new BombObj(this.scene,BombIndex,2)
        this.mapManager.setMapTileByIndex(BombIndex,newBomb)
        const pos = tranIndexToPosition(BombIndex)
        playerObj.canPassBombPosList.push(pos)
        // playerObj.passthroughBombIndex = playerCenterIndex

    }
}

        // }
        // } 
        // else if(playerObj.isMoving) {
        //     const event: PlayerMoveEvent = {
        //         type: "playerMove",
        //         payload: { manKey: this.selfManSpriteKey, x, y, dir: playerObj.dir, isMoving: false }
        //     }
        //     this.eventManager.handleEvent(event)
        //     wsEmitter.send("move", event.payload as never)
        // }
        // const bombPower = this.selfManState.bombPower
        // if (this.inputManager.isBombPressed()) {
        //     const manCenteIndex = playerObj.getCenterMapIndex()
        //     const event: CreateBombEvent = {
        //         type: "createBomb",
        //         payload: { manKey: this.selfManSpriteKey, x: manCenteIndex.x, y: manCenteIndex.y, bombPower }
        //     }
        //     this.eventManager.handleEvent(event)
        //     wsEmitter.send("generateBomb", event.payload as never)
        // }