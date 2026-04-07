import { wsEmitter } from "../../websocket"
import { ObjManager } from "../objManager"
import { GameStateChangeEvent } from "./events"

export class EventManager {
    private gameStateChangeQueue: GameStateChangeEvent[] = []

    constructor(private objManager: ObjManager) {
        this.handleGameStateChange = this.handleGameStateChange.bind(this)
        this.initListenGameEventFromServer()
    }

    handleGameStateChange(payload: GameStateChangeEvent[]) {
        this.gameStateChangeQueue.push(...payload)
    }

    initListenGameEventFromServer() {
        wsEmitter.on("gameStateChanged", this.handleGameStateChange as never)
    }

    destroy() {
        wsEmitter.off("gameStateChanged", this.handleGameStateChange as never)
        this.gameStateChangeQueue = []
    }
    /////////////////////////////////////////////////
    consumeStateChangeEvent() {
        while (this.gameStateChangeQueue.length !== 0) {
            const event = this.gameStateChangeQueue.shift()
            if (!event) break
            switch (event.type) {
                case "playerMove":
                    this.objManager.handlePlayerMoveEventFromServer(event.payload)
                    break
                case "generateBomb":
                    this.objManager.handleGenerateBombEventFromServer(event.payload)
                    break
                case "bombExplode":
                    this.objManager.handleBombExplodeEventFromServer(event.payload)
                    break
                case "createItem":
                    this.objManager.handleCreateItemEventFromServer(event.payload)
                    break
                case "removeItem":
                    this.objManager.handleRemoveItemEventFromServer(event.payload)
                    break
                case "playerDie":
                    for (const p of event.payload) {
                        this.objManager.handlePlayerDieEventFromServer(p)
                    }
                    break
                case "gameOver":
                    // handled by the scene via wsEmitter
                    break
                default:
                    break
            }
        }
    }
}
