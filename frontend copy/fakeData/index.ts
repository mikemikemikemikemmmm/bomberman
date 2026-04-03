import type { RoomSummary, RoomDetail, MapData } from "../src/ui/types";

export const FAKE_MAPS: MapData[] = [
  { id: 1, name: "沙漠廢墟" },
  { id: 2, name: "極地冰原" },
  { id: 3, name: "熱帶叢林" },
  { id: 4, name: "霓虹都市" },
  { id: 5, name: "火山熔岩" },
  { id: 6, name: "深海遺跡" },
];

export const FAKE_ROOMS: RoomSummary[] = [
  { id: 1, currentPlayerNum: 3, status: "waiting",   openedSecond: 300,  mapId: 3 },
  { id: 2, currentPlayerNum: 4, status: "playering", openedSecond: 1200, mapId: 4 },
  { id: 3, currentPlayerNum: 1, status: "waiting",   openedSecond: 60,   mapId: 2 },
  { id: 4, currentPlayerNum: 4, status: "playering", openedSecond: 900,  mapId: 5 },
  { id: 5, currentPlayerNum: 2, status: "waiting",   openedSecond: 180,  mapId: 1 },
];

export const FAKE_ROOM_DETAILS: Record<number, RoomDetail> = {
  1: { id: 1, status: "waiting", openedSecond: 300, mapId: 3, players: [
    { id: 1, name: "StarKnight", pingLevel: "good", isReady: true,  isHost: true  },
    { id: 2, name: "NightWolf",  pingLevel: "mid",  isReady: true,  isHost: false },
    { id: 3, name: "AquaFox",    pingLevel: "bad",  isReady: false, isHost: false },
  ]},
  3: { id: 3, status: "waiting", openedSecond: 60, mapId: 2, players: [
    { id: 7, name: "MidnightCat", pingLevel: "good", isReady: false, isHost: true },
  ]},
  5: { id: 5, status: "waiting", openedSecond: 180, mapId: 1, players: [
    { id: 10, name: "Beginner1", pingLevel: "good", isReady: true,  isHost: true  },
    { id: 11, name: "Newbie99",  pingLevel: "mid",  isReady: false, isHost: false },
  ]},
};
