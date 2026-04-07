import { wsEmitter } from '../websocket'

const PING_INTERVAL = 4_000  // non-host probes latency every 4 s
const SYNC_INTERVAL = 5_000  // host broadcasts authoritative clock every 5 s

/**
 * Keeps all peers' game-end clocks aligned.
 *
 * Host (man1):
 *   - Echoes every timeSyncPing back to its sender so they can measure RTT.
 *   - Periodically broadcasts the authoritative gameEndTime (wall-clock ms).
 *
 * Non-host:
 *   - Sends periodic pings and records one-way latency from pong replies.
 *   - On each broadcast applies an NTP-style offset correction:
 *       adjustedEndTime = gameEndTime + (sentAt + latency − receiveTime)
 *     This compensates for both transit delay and clock skew between peers.
 */
export class TimeSyncManager {
    private latency = 50  // initial conservative estimate in ms

    private pingTimer: ReturnType<typeof setInterval> | null = null
    private syncTimer: ReturnType<typeof setInterval> | null = null

    // Keep named references so we can call wsEmitter.off cleanly
    private readonly onPing = ({ sentAt, from }: { sentAt: number; from: string }) => {
        wsEmitter.send("timeSyncPong", { sentAt, to: from })
    }

    private readonly onPong = ({ sentAt, to }: { sentAt: number; to: string }) => {
        if (to !== this.peerId) return
        this.latency = (Date.now() - sentAt) / 2
    }

    private readonly onBroadcast = ({ gameEndTime, sentAt }: { gameEndTime: number; sentAt: number }) => {
        const receiveTime     = Date.now()
        const adjustedEndTime = gameEndTime + (sentAt + this.latency - receiveTime)
        this.setGameEndTime(adjustedEndTime)
    }

    constructor(
        /** Identifier for this peer (used to filter pong replies). */
        private readonly peerId: string,
        private readonly isHost: boolean,
        /** Returns the host's current authoritative gameEndTime (Date.now()-based). */
        private readonly getGameEndTime: () => number,
        /** Called on non-host peers to update their local gameEndTime. */
        private readonly setGameEndTime: (t: number) => void,
    ) {}

    start() {
        if (this.isHost) {
            wsEmitter.on("timeSyncPing", this.onPing)
            this.syncTimer = setInterval(() => {
                wsEmitter.send("timeSyncBroadcast", {
                    gameEndTime: this.getGameEndTime(),
                    sentAt: Date.now(),
                })
            }, SYNC_INTERVAL)
        } else {
            wsEmitter.on("timeSyncPong",      this.onPong)
            wsEmitter.on("timeSyncBroadcast", this.onBroadcast)
            this.pingTimer = setInterval(() => {
                wsEmitter.send("timeSyncPing", { sentAt: Date.now(), from: this.peerId })
            }, PING_INTERVAL)
        }
    }

    destroy() {
        if (this.pingTimer !== null) clearInterval(this.pingTimer)
        if (this.syncTimer !== null) clearInterval(this.syncTimer)
        wsEmitter.off("timeSyncPing",      this.onPing)
        wsEmitter.off("timeSyncPong",      this.onPong)
        wsEmitter.off("timeSyncBroadcast", this.onBroadcast)
    }
}
