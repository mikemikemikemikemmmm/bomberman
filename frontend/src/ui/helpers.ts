import { wsEmitter } from "../websocket";
import { UIEventMap, WsEventMap } from "../websocket/eventMap";
import { MAPS, MAP_UI_META } from "./constants";
import { MapPickData } from "./types";

export const mapById = (id: number): MapPickData =>
  MAPS.find(m => m.id === id) ?? MAPS[0];

export const mapUiById = (id: number) =>
  MAP_UI_META[id] ?? MAP_UI_META[1];

export const sendMsgByUi = <E extends keyof UIEventMap>(
  eventName: E,
  payload?:any
) => {
  wsEmitter.sendEventToServer(eventName, payload as WsEventMap[E]);
};