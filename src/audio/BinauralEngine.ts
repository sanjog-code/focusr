import { AudioMaster, soundClick } from './AudioMaster';

export const BinauralEngine = {
    oscL: null as OscillatorNode | null,
    oscR: null as OscillatorNode | null,
    panL: null as StereoPannerNode | null,
    panR: null as StereoPannerNode | null,
    gain: null as GainNode | null,
    activeType: 'off',

    freqs: {
        alpha: 10,
        theta: 6,
        gamma: 40
    } as Record<string, number>,

    init(): void {
        const btns = document.querySelectorAll('[data-binaural]');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = (btn as HTMLElement).dataset.binaural;
                if (!type) return;
                this.setFrequency(type);
                btns.forEach(b => b.classList.toggle('active', b === btn));
                soundClick();
            });
        });
    },

    setFrequency(type: string): void {
        if (this.activeType === type) {
            this.stop();
            this.activeType = 'off';
            return;
        }

        const beat = this.freqs[type];
        if (!beat) {
            this.stop();
            this.activeType = 'off';
            return;
        }

        this.stop();
        const ctx = AudioMaster.getCtx();
        if (!ctx) return;

        const base = 216; // Harmonic carrier frequency (432Hz subharmonic)
        const leftFreq = base;
        const rightFreq = base + beat;

        this.gain = ctx.createGain();
        this.gain.gain.setValueAtTime(0.001, ctx.currentTime);
        this.gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.2);

        this.oscL = ctx.createOscillator();
        this.oscR = ctx.createOscillator();
        this.oscL.type = 'sine';
        this.oscR.type = 'sine';
        this.oscL.frequency.setValueAtTime(leftFreq, ctx.currentTime);
        this.oscR.frequency.setValueAtTime(rightFreq, ctx.currentTime);

        if (ctx.createStereoPanner) {
            this.panL = ctx.createStereoPanner();
            this.panR = ctx.createStereoPanner();
            this.panL.pan.setValueAtTime(-1, ctx.currentTime);
            this.panR.pan.setValueAtTime(1, ctx.currentTime);

            this.oscL.connect(this.panL);
            this.panL.connect(this.gain);

            this.oscR.connect(this.panR);
            this.panR.connect(this.gain);
        } else {
            this.oscL.connect(this.gain);
            this.oscR.connect(this.gain);
        }

        this.gain.connect(ctx.destination);
        this.oscL.start();
        this.oscR.start();
        this.activeType = type;
    },

    stop(): void {
        if (this.gain) {
            try {
                const ctx = AudioMaster.getCtx();
                if (ctx) {
                    this.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                }
            } catch {}
        }
        setTimeout(() => {
            try {
                if (this.oscL) { this.oscL.stop(); this.oscL.disconnect(); }
                if (this.oscR) { this.oscR.stop(); this.oscR.disconnect(); }
            } catch {}
            this.oscL = null;
            this.oscR = null;
            this.gain = null;
        }, 450);
        this.activeType = 'off';
    }
};

if (typeof window !== 'undefined') {
    (window as any).BinauralEngine = BinauralEngine;
}
