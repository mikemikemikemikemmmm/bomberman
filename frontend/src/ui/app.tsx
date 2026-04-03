import { useState, useEffect, useRef } from "react";
import RoomCard from "./components/RoomCard";
import CurrentRoom from "./components/CurrentRoom";
import { mapById, sendMsgByUi } from "./helpers";
import type { RoomSummary, RoomDetail, RoomPlayer } from "./types";
import { useWsEvent } from "./hook";
import { wsEmitter } from "../websocket";

export default function UIApp({ userId }: { userId: number }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const handleGameStatusChange = (e: Event) => {
      const isPlaying = (e as CustomEvent<boolean>).detail;
      setPlaying(isPlaying);
    };
    window.addEventListener("gameUpdate", handleGameStatusChange);
    return () => window.removeEventListener("gameUpdate", handleGameStatusChange);
  }, []);

  const [playerName, setPlayerName] = useState("");
  const handleChangePlayerName = (name: string) => {
    sendMsgByUi("setName", name);
    setPlayerName(name);
  };

  // ─── Room list (lobby) ────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  useWsEvent("roomList", playing, setRooms);

  // ─── Current room ─────────────────────────────────────────────────────────
  // We track roomId locally (known when sending joinRoom / createRoom)
  // and mapId locally (known when sending changeMap; default 1)
  const joinedRoomIdRef = useRef<number | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<RoomDetail | null>(null);
  const [localMapId, setLocalMapId] = useState(1);

  useWsEvent("roomState", playing, (players: RoomPlayer[]) => {
    setJoinedRoom(prev => ({
      id: joinedRoomIdRef.current ?? prev?.id ?? 0,
      players,
      mapId: localMapId,
    }));
  });

  // ─── Game started ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = ({ gameEndTime }: { gameId: number; gameEndTime: number }) => {
      window.dispatchEvent(new CustomEvent("startGame", { detail: { gameEndTime, players: joinedRoom?.players ?? [] } }));
    };
    wsEmitter.on("gameStarted", handler);
    return () => wsEmitter.off("gameStarted", handler);
  }, [joinedRoom]);

  // ─── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  // ─── Error from server ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = ({ msg }: { msg: string }) => showToast(msg);
    wsEmitter.on("error", handler);
    return () => wsEmitter.off("error", handler);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const [showMapPicker, setShowMapPicker] = useState(false);

  const joinRoom = (roomId: number) => {
    if (!playerName.trim()) return showToast("請先輸入玩家名稱");
    if (joinedRoom) return showToast("請先離開目前的房間");
    joinedRoomIdRef.current = roomId;
    sendMsgByUi("joinRoom", roomId);
  };

  const leaveRoom = () => {
    if (!joinedRoom) return;
    joinedRoomIdRef.current = null;
    setJoinedRoom(null);
    setShowMapPicker(false);
    sendMsgByUi("leaveRoom", null);
    showToast("已離開房間");
  };

  const createRoom = () => {
    if (!playerName.trim()) return showToast("請先輸入玩家名稱");
    if (joinedRoom) return showToast("請先離開目前的房間");
    // Room ID will be unknown until roomState arrives; use 0 as placeholder
    joinedRoomIdRef.current = 0;
    sendMsgByUi("createRoom", null);
  };

  const toggleReady = () => {
    if (!joinedRoom) return;
    sendMsgByUi("toggleReady", null);
  };

  const startGame = () => {
    if (!joinedRoom) return;
    sendMsgByUi("startGame", null);
  };

  const changeMap = (mapId: number) => {
    if (!joinedRoom) return;
    setLocalMapId(mapId);
    setJoinedRoom(prev => prev ? { ...prev, mapId } : null);
    sendMsgByUi("changeMap", mapId);
    setShowMapPicker(false);
    showToast("地圖已更新：" + mapById(mapId).name);
  };

  const self = joinedRoom?.players.find(p => p.clientId === userId);
  const amHost = self?.isHost ?? false;
  const isReady = self?.isReady ?? false;

  if (playing) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 font-sans">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-lg tracking-tight">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-extrabold">
            N
          </div>
          NEXUS ARENA
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center border-[1.5px] border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-slate-50">
            <span className="px-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-r border-slate-200 h-9 flex items-center bg-indigo-50/60">
              玩家
            </span>
            <input
              className="bg-transparent outline-none px-3 h-9 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 w-36"
              placeholder="輸入名稱..."
              maxLength={16}
              value={playerName}
              onChange={e => handleChangePlayerName(e.target.value)}
            />
          </div>

          <button
            onClick={createRoom}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[13px] font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
          >
            ＋ 創建房間
          </button>
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── Room list ── */}
        <section>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            房間列表
            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-px rounded-full font-bold">
              {rooms.length}
            </span>
            <span className="flex-1 h-px bg-slate-200" />
          </p>

          {rooms.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              <div className="text-4xl mb-2">🎮</div>
              <p className="font-bold text-sm">目前沒有任何房間，快來創建第一個吧！</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isCurrent={joinedRoom?.id === room.id}
                  onJoin={joinRoom}
                />
              ))}
            </div>
          )}
        </section>

        <CurrentRoom
          currentRoom={joinedRoom}
          userId={userId}
          amHost={amHost}
          isReady={isReady}
          showMapPicker={showMapPicker}
          onToggleReady={toggleReady}
          onLeave={leaveRoom}
          onToggleMapPicker={() => setShowMapPicker(v => !v)}
          onChangeMap={changeMap}
          onStartGame={startGame}
        />
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-800 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-bounce-in">
          {toast}
        </div>
      )}
    </div>
  );
}
