/**
 * TimerHeartbeat: Web Worker heartbeat engine that bypasses background tab throttling
 */
export const TimerHeartbeat = {
    worker: null as Worker | null,
    fallbackInterval: null as any,
    onTick: null as (() => void) | null,

    init(onTick?: () => void): void {
        if (onTick) this.onTick = onTick;
        try {
            const blob = new Blob([
                `let timer = null;
                self.onmessage = function(e) {
                    if (e.data.action === 'start') {
                        if (timer) clearInterval(timer);
                        timer = setInterval(() => self.postMessage('tick'), e.data.interval || 50);
                    } else if (e.data.action === 'stop') {
                        if (timer) { clearInterval(timer); timer = null; }
                    }
                };`
            ], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            this.worker.onmessage = (e) => {
                if (e.data === 'tick' && this.onTick) {
                    this.onTick();
                }
            };
        } catch (err) {
            console.warn('Web Worker heartbeat unsupported, falling back to interval:', err);
            this.worker = null;
        }
    },

    start(intervalMs = 50): void {
        this.stop();
        if (this.worker) {
            this.worker.postMessage({ action: 'start', interval: intervalMs });
        } else {
            this.fallbackInterval = setInterval(() => {
                if (this.onTick) this.onTick();
            }, intervalMs);
        }
    },

    stop(): void {
        if (this.worker) {
            this.worker.postMessage({ action: 'stop' });
        }
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
            this.fallbackInterval = null;
        }
    }
};

if (typeof window !== 'undefined') {
    (window as any).TimerHeartbeat = TimerHeartbeat;
}
