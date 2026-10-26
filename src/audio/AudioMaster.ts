/**
 * AudioMaster: Singleton Web Audio engine with autoplay compliance
 */
export const AudioMaster = {
    ctx: null as AudioContext | null,
    isUnlocked: false,

    getCtx(): AudioContext | null {
        if (!this.ctx) {
            const AC = window.AudioContext || (window as any).webkitAudioContext;
            if (AC) {
                this.ctx = new AC();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    },

    unlock(): void {
        if (this.isUnlocked) return;
        const ctx = this.getCtx();
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    this.isUnlocked = true;
                }).catch(() => {});
            } else {
                this.isUnlocked = true;
            }
        }
    }
};

// Global user-gesture autoplay unlock
if (typeof window !== 'undefined') {
    (window as any).AudioMaster = AudioMaster;
    ['pointerdown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, () => AudioMaster.unlock(), { once: true, passive: true });
    });
}

export function playTone(freqs: number[], dur = 0.4, vol = 0.18): void {
    try {
        const ctx = AudioMaster.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const startTime = now + (i * 0.12);
            osc.frequency.setValueAtTime(f, startTime);
            gain.gain.setValueAtTime(vol, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + dur);
        });
    } catch {}
}

export const soundClick = () => playTone([880], 0.04, 0.05);
export const soundComplete = () => playTone([660, 880, 1100], 0.35, 0.15);
export const soundBreak = () => playTone([523, 659], 0.3, 0.12);
export const soundResume = () => playTone([440], 0.15, 0.08);
export const soundNotification = () => playTone([700], 0.12, 0.06);
export const soundWarning = () => playTone([300, 240, 180], 0.25, 0.2);

export function soundWaterDrop(liquidHeightFraction = 0.5): void {
    try {
        const ctx = AudioMaster.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const baseFreq = 620 + (liquidHeightFraction * 420);
        const endFreq = baseFreq * 1.85;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.055);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    } catch {}
}

export function playLoudWakeupAlarm(): void {
    try {
        const ctx = AudioMaster.getCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-12, now);
        comp.knee.setValueAtTime(4, now);
        comp.ratio.setValueAtTime(12, now);
        comp.attack.setValueAtTime(0.003, now);
        comp.release.setValueAtTime(0.15, now);

        const master = ctx.createGain();
        master.gain.setValueAtTime(0.92, now);
        comp.connect(master);
        master.connect(ctx.destination);

        const pulseCount = 8;
        const pulseDur = 0.18;
        for (let i = 0; i < pulseCount; i++) {
            const tStart = now + (i * (pulseDur + 0.07));
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1320, tStart);
            osc.frequency.exponentialRampToValueAtTime(i % 2 === 0 ? 1760 : 660, tStart + pulseDur);
            g.gain.setValueAtTime(0.85, tStart);
            g.gain.exponentialRampToValueAtTime(0.001, tStart + pulseDur);
            osc.connect(g);
            g.connect(comp);
            osc.start(tStart);
            osc.stop(tStart + pulseDur);
        }
    } catch {}
}
