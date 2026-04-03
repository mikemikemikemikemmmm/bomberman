import type { RoomPlayer } from "../types";

interface Props {
  player: RoomPlayer;
  isMe: boolean;
}

export default function PlayerRow({ player, isMe }: Props) {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border-[1.5px] transition-all
      ${player.isHost ? "border-amber-200 bg-amber-50"
        : isMe        ? "border-indigo-200 bg-indigo-50"
        :                "border-transparent bg-slate-50"}`}>

      {/* Avatar */}
      <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0
        ${player.isHost ? "bg-amber-100 text-amber-700"
          : isMe        ? "bg-indigo-100 text-indigo-600"
          :                "bg-slate-200 text-slate-500"}`}>
        {player.clientName.slice(0, 2).toUpperCase()}
        {player.isHost && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center text-[7px]">
            👑
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold truncate ${player.isHost ? "text-amber-700" : "text-slate-800"}`}>
          {player.clientName}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] font-bold text-slate-400">{player.manSpriteKey}</span>
          {isMe && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-px rounded-full">
              YOU
            </span>
          )}
          {player.isHost && (
            <span className="text-[10px] font-bold text-amber-700">房主</span>
          )}
        </div>
      </div>

      {/* Ready indicator */}
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 transition-all
        ${player.isReady
          ? "border-green-500 bg-green-100 text-green-600"
          : "border-slate-200 text-slate-300"}`}>
        {player.isReady ? "✓" : "—"}
      </div>
    </div>
  );
}
