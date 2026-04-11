import { create } from "zustand"

const initialState = {
  mapId: 1,
  isPlaying: false,
}

export const useGlobalStore = create<typeof initialState>((set) => ({
  ...initialState,
  setMapId: (v: number) => set({ mapId: v }),
  setPlaying: (v: boolean) => set({ isPlaying: v }),

}))
