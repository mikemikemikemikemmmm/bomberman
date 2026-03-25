import { MAX_PLAYERS, MAP_UI_META } from "../constants";
import { mapById } from "../helpers";
import type { RoomDetail } from "../types";
import MapPicker from "./MapPicker";
import PlayerRow from "./PlayerRow";

const MY_PLAYER_ID = -1;

interface Props {
  currentRoom: RoomDetail | null;
  amHost: boolean;
  isReady: boolean;
  showMapPicker: boolean;
  onToggleReady: () => void;
  onLeave: () => void;
  onToggleMapPicker: () => void;
  onChangeMap: (mapId: number) => void;
}

export default function CurrentRoom({
  currentRoom,
  amHost,
  isReady,
  showMapPicker,
  onToggleReady,
  onLeave,
  onToggleMapPicker,
  onChangeMap,
}: Props) {
  const mapData = currentRoom ? mapById(currentRoom.mapId) : null;
  const mapUi   = currentRoom ? MAP_UI_META[currentRoom.mapId] : null;

  return (
    <aside>
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
        目前房間
        <span className="flex-1 h-px bg-slate-200" />
      </p>

      <div className="bg-white border-[1.5px] border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {!currentRoom ? (
          <div className="py-12 px-4 text-center">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-[13px] font-semibold text-slate-400 leading-relaxed">
              尚未加入任何房間<br />從列表選擇或創建新房間
            </p>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${mapUi?.bg}`}>
                {mapUi?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-slate-800 truncate">房間 #{currentRoom.id}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[11px] font-bold ${mapUi?.color}`}>{mapData?.name}</span>
                  {amHost && (
                    <button
                      onClick={onToggleMapPicker}
                      className="text-[10px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-px rounded-md transition-colors"
                    >
                      {showMapPicker ? "收起" : "換地圖"}
                    </button>
                  )}
                </div>
              </div>
              {amHost && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full flex-shrink-0">
                  👑 房主
                </span>
              )}
            </div>

            {/* Map picker (host only) */}
            {showMapPicker && (
              <MapPicker currentMapId={currentRoom.mapId} onSelect={onChangeMap} />
            )}

            <div className="p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
                玩家
                <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-px rounded-full font-bold">
                  {currentRoom.players.length}/{MAX_PLAYERS}
                </span>
                <span className="flex-1 h-px bg-slate-100" />
              </p>

              <div className="flex flex-col gap-1.5">
                {currentRoom.players.map(player => (
                  <PlayerRow key={player.id} player={player} isMe={player.id === MY_PLAYER_ID} />
                ))}
                {Array.from({ length: Math.max(0, MAX_PLAYERS - currentRoom.players.length) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border-[1.5px] border-dashed border-slate-200 opacity-50">
                    <div className="w-8 h-8 rounded-lg border-[1.5px] border-dashed border-slate-300 flex-shrink-0" />
                    <span className="text-[11px] text-slate-400 italic">等待玩家加入...</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-100 my-3" />

              <div className="flex flex-col gap-2">
                <button
                  onClick={onToggleReady}
                  className={`w-full h-9 rounded-xl text-[13px] font-bold transition-all border-[1.5px] ${
                    isReady
                      ? "bg-green-500 text-white border-green-500 shadow-md shadow-green-100"
                      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  }`}
                >
                  {isReady ? "✓ 已準備好" : "準備好了！"}
                </button>
                <button
                  onClick={onLeave}
                  className="w-full h-8 rounded-xl text-[12px] font-bold text-red-500 bg-red-50 hover:bg-red-100 border-[1.5px] border-red-200 transition-colors"
                >
                  離開房間
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
