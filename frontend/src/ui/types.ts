import type { ManSpriteKey } from "../game/sprite_animations/sprite"

// Matches backend4 RoomListItem
export interface RoomSummary {
    id: number
    currentPlayerNum: number
    openedSecond: number
    mapId: number
}

// Matches backend4 ClientDataForRoomClient
export interface RoomPlayer {
    clientId: number
    clientName: string
    isReady: boolean
    isHost: boolean
    manSpriteKey: ManSpriteKey
}

// Built client-side from roomState + locally tracked roomId/mapId
export interface RoomDetail {
    id: number
    players: RoomPlayer[]
    mapId: number
}

export interface MapData {
    id: number
    name: string
}
