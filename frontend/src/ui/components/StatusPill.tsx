import { MAX_PLAYERS } from "../constants";
import type { RoomSummary } from "../types";

interface Props {
  room: RoomSummary;
}

export default function StatusPill({ room }: Props) {
  if (room.status === "playing")
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 min-w-[72px] justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
        遊玩中
      </span>
    );

  if (room.currentPlayerNum >= MAX_PLAYERS)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 min-w-[72px] justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
        已滿員
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 min-w-[72px] justify-center">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
      等待中
    </span>
  );
}
