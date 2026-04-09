import { wsEmitter } from "../../websocket"
import { SendGenerateBombPayload, SendSelfPlayerMovePayload } from "../../websocket/eventMap"
import { ObjManager } from "../objManager"
import { GameStateChangeEvent } from "./events"

export class EventManager {
    private gameStateChangeQueue: GameStateChangeEvent[] = []

    constructor(public objManager: ObjManager, private onGameOver?: () => void) {
        this.handleGameStateChange = this.handleGameStateChange.bind(this)
        this.initListenGameEventFromServer()
    }

    initListenGameEventFromServer() {
        wsEmitter.on("gameStateChanged", this.handleGameStateChange as never)
    }
    destroy() {
        wsEmitter.off("gameStateChanged", this.handleGameStateChange as never)
        this.gameStateChangeQueue = []
    }
    sendGenerateBombEvent(generateBombEventPayload: SendGenerateBombPayload) {
        wsEmitter.sendEventToServer("generateBomb", generateBombEventPayload)
    }
    sendSelfManMoveEvent(selfManMovePayload: SendSelfPlayerMovePayload) {
        wsEmitter.sendEventToServer("playerMove", selfManMovePayload)
    }
    /////////////////////////////////////////////////
    handleGameStateChange(payload: GameStateChangeEvent[]) {
        this.gameStateChangeQueue.push(...payload)
    }

    consumeStateChangeEvent() {
        while (this.gameStateChangeQueue.length !== 0) {
            const event = this.gameStateChangeQueue.shift()
            // console.log("consume", event)
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
                case "removeFire":
                    this.objManager.handleReomoveFireEventFromServer(event.payload)
                    break
                case "createItem":
                    this.objManager.handleCreateItemEventFromServer(event.payload)
                    break
                case "removeItem":
                    this.objManager.handleRemoveItemEventFromServer(event.payload)
                    break
                case "playerGetItem":
                    this.objManager.handlePlayerGetItemEventFromServer(event.payload)
                    break
                case "playerDie":
                    for (const p of event.payload) {
                        this.objManager.handlePlayerDieEventFromServer(p)
                    }
                    break
                case "gameOver":
                    this.onGameOver?.()
                    break
                default:
                    break
            }
        }
    }
}
