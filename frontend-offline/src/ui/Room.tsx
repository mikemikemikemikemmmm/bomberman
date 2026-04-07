import { useState, useEffect, useCallback } from 'react'
import { useGlobalStore } from '../store'
import { sendMsgByUi } from './helpers'
import { useWsEvent } from './hook'
import type { RoomDetail, RoomPlayer } from './types'

interface Props {
  startPlaying: (gameId: number) => void
}

export default function Room({  startPlaying }: Props) {
  const userId = useGlobalStore(s => s.userId)
  const leaveRoom = useGlobalStore(s => s.leaveRoom)
  const setMapId = useGlobalStore(s => s.setMapId)

  const [currentRoom, setCurrentRoom] = useState<RoomDetail | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  // Sync room state from server
  useWsEvent('roomState', false, useCallback(({ roomId: id, mapId, players }: { roomId: number; mapId: number; players: RoomPlayer[] }) => {
    setCurrentRoom({ id, players, mapId })
    setMapId(mapId)
    // Keep isReady in sync with what server says about us
    const me = players.find(p => p.clientId === userId)
    if (me) setIsReady(me.isReady)
  }, [userId, setMapId]))


  const amHost = currentRoom?.players.find(p => p.clientId === userId)?.isHost ?? false

  const handleToggleReady = () => {
    sendMsgByUi('toggleReady', undefined)
  }

  const handleLeave = () => {
    sendMsgByUi('leaveRoom', undefined)
    leaveRoom()
  }

  const handleChangeMap = (mapId: number) => {
    sendMsgByUi('changeMap', mapId)
    setShowMapPicker(false)
  }

  const handleStartGame = () => {
    sendMsgByUi('startGame', undefined)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-md">
        <CurrentRoom
          currentRoom={currentRoom}
          userId={userId ?? 0}
          amHost={amHost}
          isReady={isReady}
          showMapPicker={showMapPicker}
          onToggleReady={handleToggleReady}
          onLeave={handleLeave}
          onToggleMapPicker={() => setShowMapPicker(v => !v)}
          onChangeMap={handleChangeMap}
          onStartGame={handleStartGame}
        />
      </div>
    </div>
  )
}
