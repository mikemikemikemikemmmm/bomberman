import type { MapData, PingLevel } from "./types";

export const MAX_PLAYERS = 4;
export const MY_PLAYER_ID = -1;

export const MAPS: MapData[] = [
  { id: 1, name: "沙漠廢墟" },
  { id: 2, name: "極地冰原" },
  { id: 3, name: "熱帶叢林" },
  { id: 4, name: "霓虹都市" },
  { id: 5, name: "火山熔岩" },
  { id: 6, name: "深海遺跡" },
];

export const MAP_UI_META: Record<number, { icon: string; color: string; bg: string }> = {
  1: { icon: "🏜",  color: "text-amber-600",  bg: "bg-amber-50"  },
  2: { icon: "🧊",  color: "text-sky-500",    bg: "bg-sky-50"    },
  3: { icon: "🌿",  color: "text-green-600",  bg: "bg-green-50"  },
  4: { icon: "🏙",  color: "text-violet-600", bg: "bg-violet-50" },
  5: { icon: "🌋",  color: "text-red-500",    bg: "bg-red-50"    },
  6: { icon: "🌊",  color: "text-cyan-600",   bg: "bg-cyan-50"   },
};

export const PING_STYLES: Record<PingLevel, string> = {
  good: "bg-green-100 text-green-700",
  mid:  "bg-amber-100 text-amber-700",
  bad:  "bg-red-100   text-red-600",
};
