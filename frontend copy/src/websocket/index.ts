import EventEmitter from 'eventemitter3';
import { WS_URL } from '../config';
import { WsEventMap } from './eventMap';
export class WsEmitter {
  private emitter = new EventEmitter();
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 3000;

  // 等待連線的 Promise 佇列
  private connectionResolvers: (() => void)[] = [];
  private connectionRejectors: ((err: Error) => void)[] = [];

  constructor(private url: string) { }

  // ─── 連線 ────────────────────────────────────

  init() {
    if (this.ws?.readyState === WebSocket.OPEN) return; // 已連線不重複初始化
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      // resolve 所有等待中的 Promise
      this.connectionResolvers.forEach(resolve => resolve());
      this.connectionResolvers = [];
      this.connectionRejectors = [];
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        this.emit(type, payload);
      } catch {
        console.error('訊息解析失敗', event.data);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', undefined);
      this.retry();
    };

    this.ws.onerror = () => {
      this.emit('errorWhenConnect', undefined);
      this.ws?.close();
    };
  }

  private retry() {
    if (this.retryCount >= this.maxRetries) {
      const err = new Error('連線失敗，已達最大重連次數');
      // reject 所有等待中的 Promise
      this.connectionRejectors.forEach(reject => reject(err));
      this.connectionResolvers = [];
      this.connectionRejectors = [];
      return;
    }
    this.retryCount++;
    console.log(`第 ${this.retryCount} 次重連...`);
    setTimeout(() => this.init(), this.retryDelay);
  }

  close() {
    this.maxRetries = 0;
    this.ws?.close();
  }

  // ─── 傳送 ────────────────────────────────────

  sendEventToServer<E extends keyof WsEventMap>(type: E, payload: WsEventMap[E]) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      // console.warn('WebSocket 尚未連線');
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  // ─── EventEmitter ────────────────────────────

  on<E extends keyof WsEventMap>(event: E, listener: (data: WsEventMap[E]) => void) {
    this.emitter.on(event as string, listener);
    return this;
  }

  off<E extends keyof WsEventMap>(event: E, listener: (data: WsEventMap[E]) => void) {
    this.emitter.off(event as string, listener);
    return this;
  }

  once<E extends keyof WsEventMap>(event: E, listener: (data: WsEventMap[E]) => void) {
    this.emitter.once(event as string, listener);
    return this;
  }

  private emit<EventKey extends keyof WsEventMap>(event: EventKey, data: WsEventMap[EventKey]) {
    this.emitter.emit(event, data);
  }

  // ─── 狀態 ────────────────────────────────────

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }


  waitForUserId(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.once("connected", ({ userId }) => resolve(userId));
      this.once("errorWhenConnect", () => reject(new Error("連線失敗")));
    });
  }
}

export const wsEmitter = new WsEmitter(WS_URL);