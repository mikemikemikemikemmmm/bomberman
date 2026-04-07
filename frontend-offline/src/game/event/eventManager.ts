// import { wsEmitter } from "../../websocket"
import { ObjManager } from "../objManager"
import { GameStateChangeEvent } from "./events"

export class EventManager {
    private gameStateChangeQueue: GameStateChangeEvent[] = []

    constructor(private objManager: ObjManager) {
        this.handleGameStateChange = this.handleGameStateChange.bind(this)
        // this.initListenGameEvent()
    }

    handleGameStateChange(payload: GameStateChangeEvent[]) {
        this.gameStateChangeQueue.push(...payload)
    }

    // initListenGameEvent() {
    //     wsEmitter.on("gameStateChanged", this.handleGameStateChange as never)
    // }

    destroy() {
        // wsEmitter.off("gameStateChanged", this.handleGameStateChange as never)
        this.gameStateChangeQueue = []
    }
    /////////////////////////////////////////////////
    consumeStateChangeEvent() {
        while (this.gameStateChangeQueue.length !== 0) {
            const event = this.gameStateChangeQueue.shift()
            if (!event) break
            switch (event.type) {
                case "playerMove":
                    this.objManager.handlePlayerMoveEvent(event.payload)
                    break
                case "generateBomb":
                    this.objManager.handleGenerateBombEvent(event.payload)
                    break
                case "bombExplode":
                    this.objManager.handleBombExplodeEvent(event.payload)
                    break
                case "createItem":
                    this.objManager.handleCreateItemEvent(event.payload)
                    break
                case "removeItem":
                    this.objManager.handleRemoveItemEvent(event.payload)
                    break
                case "playerDie":
                    for (const p of event.payload) {
                        this.objManager.handlePlayerDieEvent(p)
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
