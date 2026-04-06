import { useState, useCallback } from 'react'
import { useGlobalStore } from '../store'
import { sendMsgByUi } from './helpers'
import { useWsEvent } from './hook'
import type { RoomSummary } from './types'

export default function Lobby() {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const setRoomId = useGlobalStore(s => s.setRoomId)
  const roomId = useGlobalStore(s => s.roomId)

  useWsEvent('roomList', false, useCallback((data: RoomSummary[]) => {
    setRooms(data)
  }, []))

  // After createRoom the server sends roomState — pick up the roomId from it
  useWsEvent('roomState', false, useCallback(({ roomId }: { roomId: number; mapId: number; players: any[] }) => {
    setRoomId(roomId)
  }, [setRoomId]))

  const handleCreateRoom = () => {
    sendMsgByUi('createRoom', undefined)
  }

  const handleJoin = (id: number) => {
    sendMsgByUi('joinRoom', id)
    setRoomId(id)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-12 px-4">

      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">💣 Bomberman</h1>
        <p className="text-sm text-slate-400 mt-1">選擇房間加入或建立新房間</p>
      </div>


      {/* Room list */}
      <div className="w-full max-w-2xl flex flex-col gap-2 mb-6">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
          可用房間
          <span className="flex-1 h-px bg-slate-200" />
          <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-px rounded-full font-bold">{rooms.length}</span>
        </p>

        {rooms.length === 0 ? (
          <div className="bg-white border-[1.5px] border-dashed border-slate-200 rounded-2xl py-12 text-center">
            <div className="text-4xl mb-3">🏚</div>
            <p className="text-[13px] font-semibold text-slate-400">目前沒有房間，建立第一個吧！</p>
          </div>
        ) : (
          rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              isCurrent={room.id === roomId}
              onJoin={handleJoin}
            />
          ))
        )}
      </div>

      {/* Create room */}
      <div className="w-full max-w-2xl">
        <button
          onClick={handleCreateRoom}
          className="w-full h-11 rounded-2xl text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 border border-indigo-600 transition-all"
        >
          ＋ 建立新房間
        </button>
      </div>
    </div>
  )
}
