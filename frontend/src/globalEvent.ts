import { RoomPlayer } from "./ui/types";
export interface StartGamePayload { gameEndTime: number; players: RoomPlayer[] }

export type StartGameEvent = CustomEvent<StartGamePayload>
export const dispatchStartGameEvent = (payload: StartGamePayload) => {
    window.dispatchEvent(new CustomEvent("startGame", {
        detail: {
            gameEndTime: payload.gameEndTime,
            players: [{
                clientId: 1,
                clientName: "mike",
                manSpriteKey: "man1"
            }]
        }
    }))
}
export const listenStartGameEvent = (cb:(payload:StartGamePayload)=>void) => {
    window.addEventListener("startGame", (e: Event) => {
        cb((e as StartGameEvent).detail)
    })
}