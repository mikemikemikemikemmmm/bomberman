import { useGlobalStore } from "../store"
import Lobby from "./Lobby"
import Room from "./Room"

interface Props {
  startPlaying: (gameId: number) => void
}

export default function UIRootApp(props: Props) {
  const playing = useGlobalStore((s) => !!s.gameMetaData)
  const roomId = useGlobalStore((s) => s.roomId)
  if (playing) {
    return null
  }
  if (!roomId) {
    return <Lobby />
  }
  return <Room startPlaying={props.startPlaying}  />
}