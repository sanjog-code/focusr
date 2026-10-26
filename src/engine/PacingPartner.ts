import { PacingProfile } from '../types/index';
import { safeGetJSON, safeSetJSON } from '../storage/LocalDataManager';

export const PacingPartner = {
    STORAGE_KEY: 'focusr_pacing_stats',
    DIFFICULTY_KEY: 'focusr_pacing_mode',

    getMode(): string {
        try {
            return localStorage.getItem(this.DIFFICULTY_KEY) || 'pb';
        } catch {
            return 'pb';
        }
    },

    setMode(mode: string): void {
        try {
            localStorage.setItem(this.DIFFICULTY_KEY, mode);
        } catch {}
    },

    getStats() {
        return safeGetJSON(this.STORAGE_KEY, { wins: 0, losses: 0, streak: 0, lastSplit: 0 });
    },

    saveStats(stats: any) {
        safeSetJSON(this.STORAGE_KEY, stats);
    },

    computeMetrics(sessions: any[]) {
        const defaultMetrics = {
            bestDurationMs: 2700000, // 45m default PB
            avgDurationMs: 1500000,  // 25m default 7-day average
            weeklySessions: 4.2,
            totalSessions: sessions.length,
            winRate: 0.5,
            isRookie: sessions.length < 3
        };

        if (!sessions || sessions.length === 0) return defaultMetrics;

        const durations = sessions.map(s => s.duration || s.dur || 0).filter(d => d > 30000);
        if (durations.length === 0) return defaultMetrics;

        const bestDurationMs = Math.max(...durations);
        const avgDurationMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

        return {
            bestDurationMs,
            avgDurationMs,
            weeklySessions: Math.max(1, Math.round((sessions.length / 4) * 10) / 10),
            totalSessions: sessions.length,
            winRate: 0.5,
            isRookie: false
        };
    },

    getPacingProfile(sessions: any[]): PacingProfile {
        const metrics = this.computeMetrics(sessions);
        const mode = this.getMode();

        switch (mode) {
            case 'pb':
                return {
                    name: 'Personal Best Pace',
                    speedMult: 1.0,
                    subtitle: 'Paces against your personal best duration',
                    diff: 'pb',
                    metrics
                };
            case 'avg':
                return {
                    name: '7-Day Average Pace',
                    speedMult: 0.95,
                    subtitle: 'Paces against your average focus endurance',
                    diff: 'avg',
                    metrics
                };
            case 'balanced':
            default:
                return {
                    name: 'Balanced Focus Partner',
                    speedMult: 1.0,
                    subtitle: 'Steady baseline flow pacing with zero stress',
                    diff: 'balanced',
                    metrics
                };
        }
    },

    formatSplit(splitMs: number): string {
        const isAhead = splitMs >= 0;
        const absMs = Math.abs(splitMs);
        const mins = Math.floor(absMs / 60000);
        const secs = Math.floor((absMs % 60000) / 1000);
        const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return isAhead ? `+${str} Ahead` : `-${str} Behind`;
    }
};

if (typeof window !== 'undefined') {
    (window as any).PacingPartner = PacingPartner;
    // Backwards compatibility alias
    (window as any).GhostPredictionModel = PacingPartner;
}
