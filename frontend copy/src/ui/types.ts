type RoomStatus = "playing"|"waiting"
export interface RoomSummary{
  currentPlayerNum:number,
  status:RoomStatus
  openedSecond:number,
  id:number,
  mapId:number
}

export type PingLevel = "good" | "mid" | "bad";
export interface Player{
  name:string,
  pingLevel:PingLevel,
  isReady:boolean
  isHost:boolean
  id:number
}
export interface RoomDetail{
  id:number
  players:Player[],
  status:RoomStatus,
  openedSecond:number,
  mapId:number
}

export interface MapData{
  id:number,
  name:string
}