import { MAX_PLAYERS, MAP_UI_META } from "../constants";
import { mapById } from "../helpers";
import type { RoomSummary } from "../types";
import StatusPill from "./StatusPill";

interface Props {
  room: RoomSummary;
  isCurrent: boolean;
  onJoin: (id: number) => void;
}

export default function RoomCard({ room, isCurrent, onJoin }: Props) {
  const map   = mapById(room.mapId);
  const mapUi = MAP_UI_META[room.mapId];
  const joinable = room.status === "waiting" && room.currentPlayerNum < MAX_PLAYERS;

  return (
    <div className="bg-white border-[1.5px] border-slate-100 rounded-2xl px-4 py-3 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 hover:-translate-y-px transition-all">

      {/* Map icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${mapUi.bg} flex-shrink-0`}>
        {mapUi.icon}
      </div>

      {/* Room info */}
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-slate-800 truncate">房間 #{room.id}</p>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${mapUi.bg} ${mapUi.color}`}>
          {mapUi.icon} {map.name}
        </span>
      </div>

      {/* Player dots */}
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i < room.currentPlayerNum ? "bg-indigo-500" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <span className="text-[12px] font-bold text-slate-500 min-w-[28px] text-center">
          {room.currentPlayerNum}/{MAX_PLAYERS}
        </span>
      </div>

      <StatusPill room={room} />

      {/* Action */}
      <div className="min-w-[64px] text-right">
        {isCurrent ? (
          <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
            在此房間
          </span>
        ) : joinable ? (
          <button
            onClick={() => onJoin(room.id)}
            className="text-[12px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg transition-colors"
          >
            加入
          </button>
        ) : null}
      </div>
    </div>
  );
}
