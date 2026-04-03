import { wsEmitter } from "../../websocket"
import { TILE_WIDTH } from "../gameConfig"
import { ObjManager } from "../objManager"
import { BaseObj } from "../objects/base"
import { BombObj } from "../objects/bomb"
import {
    GameEvent,
    ItemType,
    BombExplode,
    GenerateBombEvent,
    CreateItem,
    ItemEaten,
    PlayerDie,
    PlayerMoveEvent,
    PlayerMoveEventPayload,
} from "./events"

export class EventManager {
    constructor(private objManager: ObjManager) { }

    initListenGameEventFromServer() {
        wsEmitter.on("playerMove", payload => {
            this.handleGameEvent({ type: "playerMove", payload })
        })
        wsEmitter.on("generateBomb", payload => {
            this.handleGameEvent({ type: "generateBomb", payload })
        })
    }

    destroy() {
        wsEmitter.off("playerMove", this._onPlayerMove)
        wsEmitter.off("generateBomb", this._onGenerateBomb)
    }

    private _onPlayerMove = (payload: PlayerMoveEventPayload) => {
        this.handleGameEvent({ type: "playerMove", payload })
    }
    private _onGenerateBomb = (payload: GenerateBombEvent["payload"]) => {
        this.handleGameEvent({ type: "generateBomb", payload })
    }

    handleGameEvent(event: GameEvent) {
        switch (event.type) {
            case "playerMove":    return this.onPlayerMove(event.payload)
            case "generateBomb":  return this.onGenerateBomb(event.payload)
            case "bombExplode":   return this.onBombExplode(event.payload)
            case "createItem":    return this.onCreateItem(event.payload)
            case "itemEaten":     return this.onItemEaten(event.payload)
            case "playerDie":     return this.onPlayerDie(event.payload)
        }
    }

    private onPlayerMove(payload: PlayerMoveEventPayload) {
        const userId = this.objManager.scene.registry.get("userId") as number
        if (payload.userId === userId) return  // ignore own echoes
        const player = this.objManager.players.find(p => p.manSpriteKey === payload.manKey)
        if (!player) return
        player.handleMoveEvent(payload)
    }

    private onGenerateBomb({ x, y, bombPower }: GenerateBombEvent["payload"]) {
        const index = { x, y }
        const bomb = new BombObj(this.objManager.scene, index, bombPower)
        this.objManager.bombs.push(bomb)
        this.objManager.mapManager.setMapTileByIndex(index, bomb)
    }

    private onBombExplode({ x, y, cells }: BombExplode["payload"]) {
        const { bombs, bricks, scene } = this.objManager

        const bombIdx = bombs.findIndex(
            b => Math.round(b.sprite.x / TILE_WIDTH) === x &&
                Math.round(b.sprite.y / TILE_WIDTH) === y
        )
        if (bombIdx !== -1) {
            bombs[bombIdx].sprite.destroy()
            bombs.splice(bombIdx, 1)
        }

        for (const cell of cells) {
            const brickIdx = bricks.findIndex(
                b => Math.round(b.sprite.x / TILE_WIDTH) === cell.x &&
                    Math.round(b.sprite.y / TILE_WIDTH) === cell.y
            )
            if (brickIdx !== -1) {
                bricks[brickIdx].sprite.destroy()
                bricks.splice(brickIdx, 1)
            }

            const exp = scene.add.sprite(cell.x * TILE_WIDTH, cell.y * TILE_WIDTH, "explosion", 0)
            exp.setOrigin(0, 0)
            exp.play("explosion-center")
            exp.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => exp.destroy())
        }
    }

    private onCreateItem({ x, y, itemType }: CreateItem["payload"]) {
        const item = new BaseObj(this.objManager.scene, { x, y }, "items", 0, "item")
        item.sprite.play(itemTypeToAnimKey(itemType))
        this.objManager.staticItems.push(item)
    }

    private onItemEaten({ x, y }: ItemEaten["payload"]) {
        const { staticItems } = this.objManager
        const idx = staticItems.findIndex(
            i => Math.round(i.sprite.x / TILE_WIDTH) === x &&
                Math.round(i.sprite.y / TILE_WIDTH) === y
        )
        if (idx !== -1) {
            staticItems[idx].sprite.destroy()
            staticItems.splice(idx, 1)
        }
    }

    private onPlayerDie({ manKey }: PlayerDie["payload"]) {
        const { players } = this.objManager
        const idx = players.findIndex(p => p.manSpriteKey === manKey)
        if (idx === -1) return
        const player = players[idx]
        player.sprite.play(`${manKey}_die`)
        player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            player.sprite.destroy()
            players.splice(idx, 1)
        })
    }
}

function itemTypeToAnimKey(itemType: ItemType): string {
    switch (itemType) {
        case "fire":     return "fire"
        case "speed":    return "speed"
        case "moreBomb": return "more-bomb"
    }
}
