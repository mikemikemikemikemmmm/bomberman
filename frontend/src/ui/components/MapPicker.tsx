import { MAPS, MAP_UI_META } from "../constants";

interface Props {
  currentMapId: number;
  onSelect: (mapId: number) => void;
}

export default function MapPicker({ currentMapId, onSelect }: Props) {
  return (
    <div className="border-b border-slate-100 p-3 grid grid-cols-3 gap-1.5">
      {MAPS.map(m => {
        const ui = MAP_UI_META[m.id];
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`border-[1.5px] rounded-xl p-2 text-center cursor-pointer transition-all
              ${currentMapId === m.id
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50"}`}
          >
            <div className="text-xl leading-none">{ui.icon}</div>
            <div className={`text-[10px] font-bold mt-1 leading-tight
              ${currentMapId === m.id ? "text-indigo-600" : "text-slate-500"}`}>
              {m.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
