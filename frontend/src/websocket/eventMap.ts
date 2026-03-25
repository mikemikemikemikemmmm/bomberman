import { RoomDetail, RoomSummary } from "../ui/types"

export type UIEventMap = {
    //receive
    getRoomsList:RoomSummary[]
    getJoinedRoomData:RoomDetail
    leaveRoomResponse:boolean
    createRoomResponse:{
        success:boolean,
        data:RoomDetail
    }
    startPlaying:void
    //send
    changeUserName:string
    joinRoom:number
    leaveRoom:void
    createRoom:void
    changeReadyStatus:void
    changeMap:number
}
export type GameEventMap = {
    move: void
    generateBomb: void
    // time sync
    timeSyncPing:      { sentAt: number; from: string }
    timeSyncPong:      { sentAt: number; to: string }
    timeSyncBroadcast: { gameEndTime: number; sentAt: number }
}
export type InitEventMap = {
    connected: { userId: number };
    disconnected: void;
    errorWhenConnect: void
}
export type WsEventMap = UIEventMap &GameEventMap &InitEventMap