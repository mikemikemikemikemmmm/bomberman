import { create } from 'zustand'
import { ManSpriteKey } from './game/sprite_animations/sprite'
import { OriginMapMatrix } from './game/types'

export type GameMetaData = {
  gameId: number
  players: {
    name: string,
    manSpriteKey: ManSpriteKey,
    userId: number
  }[],
  gameEndTime: number,
  originMapMatrix: OriginMapMatrix
}

type GlobalState = {
  // ===== state =====
  userId: number | null
  userName: string
  mapId: number

  roomId: number | null
  gameMetaData: GameMetaData | null
  // ===== actions =====
  setUserId: (v: number | null) => void
  setUserName: (v: string) => void
  setMapId: (v: number) => void

  setRoomId: (roomId: number | null) => void
  setGameMetaData: (gameMetaData: GameMetaData | null) => void

  leaveRoom: () => void
  reset: () => void
}

const initialState = {
  userId: 1 as number | null, //TODO
  userName: "guest",
  mapId: 1,
  roomId: null as number | null,
  gameMetaData: null as GameMetaData | null,
}

export const useGlobalStore = create<GlobalState>((set) => ({
  ...initialState,

  // ===== 基本資料 =====
  setUserId: (v) => set({ userId: v }),
  setUserName: (v) => set({ userName: v }),
  setMapId: (v) => set({ mapId: v }),

  // ===== 遊戲狀態 =====
  setRoomId: (roomId) => set({ roomId }),
  setGameMetaData: (gameMetaData) => set({ gameMetaData }),

  leaveRoom: () =>
    set({
      roomId: null,
      gameMetaData: null,
    }),

  // ===== 重置（登出用）=====
  reset: () => set(initialState),
}))
