import { useEffect } from 'react';
import { wsEmitter } from '../websocket';
import type { UIEventMap } from '../websocket/eventMap'
export function useWsEvent<E extends keyof UIEventMap>(
  event: E,
  callback: (data: UIEventMap[E]) => void
) {
  useEffect(() => {
    wsEmitter.on(event, callback);
    return () => { wsEmitter.off(event, callback); };
  }, []);
}