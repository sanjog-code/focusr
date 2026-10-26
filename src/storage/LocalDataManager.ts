import { SessionData, BottleItem, CustomTheme, UserAccount } from '../types/index';

export function safeGetJSON<T>(key: string, defaultVal: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined) return defaultVal;
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`safeGetJSON parse error for "${key}":`, e);
        return defaultVal;
    }
}

export function safeSetJSON<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`safeSetJSON error for "${key}":`, e);
    }
}

export const LocalDataManager = {
    USER_KEY: 'focusr_user_account',
    SESSIONS_KEY: 'focusr_sessions',
    LEGACY_SESSIONS_KEY: 'focus_sessions',
    HISTORY_KEY: 'focusr_history',
    INVENTORY_KEY: 'focusr_bottle_inventory',
    LEGACY_INVENTORY_KEY: 'focus_bottles',
    DAILY_TARGET_KEY: 'focusr_daily_target_minutes',
    CUSTOM_THEMES_KEY: 'focusr_custom_themes',
    LEVEL_KEY: 'focusr_level',
    XP_KEY: 'focusr_xp',
    STREAK_KEY: 'focusr_streak',

    getAllSessions(): SessionData[] {
        const s1 = safeGetJSON<SessionData[]>(this.LEGACY_SESSIONS_KEY, []);
        const s2 = safeGetJSON<SessionData[]>(this.SESSIONS_KEY, []);
        const s3 = safeGetJSON<SessionData[]>(this.HISTORY_KEY, []);
        const seen = new Set();
        const merged: SessionData[] = [];
        [...s1, ...s2, ...s3].forEach(s => {
            if (!s) return;
            const uid = s.id || s.completedAt || (s.date + '_' + (s.duration || 0));
            if (!seen.has(uid)) {
                seen.add(uid);
                merged.push(s);
            }
        });
        return merged;
    },

    saveAllSessions(sessions: SessionData[]): void {
        safeSetJSON(this.LEGACY_SESSIONS_KEY, sessions);
        safeSetJSON(this.SESSIONS_KEY, sessions);
        safeSetJSON(this.HISTORY_KEY, sessions);
    },

    getAllBottles(): BottleItem[] {
        const b1 = safeGetJSON<BottleItem[]>(this.LEGACY_INVENTORY_KEY, []);
        const b2 = safeGetJSON<BottleItem[]>(this.INVENTORY_KEY, []);
        const seen = new Set();
        const merged: BottleItem[] = [];
        [...b1, ...b2].forEach(b => {
            if (!b || !b.id) return;
            if (!seen.has(b.id)) {
                seen.add(b.id);
                merged.push(b);
            }
        });
        return merged;
    },

    saveAllBottles(bottles: BottleItem[]): void {
        safeSetJSON(this.LEGACY_INVENTORY_KEY, bottles);
        safeSetJSON(this.INVENTORY_KEY, bottles);
    },

    exportBackup(): void {
        try {
            const sessions = this.getAllSessions();
            const inventory = this.getAllBottles();
            const data = {
                version: 2,
                exportedAt: new Date().toISOString(),
                user: safeGetJSON<UserAccount | null>(this.USER_KEY, null),
                sessions,
                history: sessions,
                inventory,
                dailyTarget: localStorage.getItem(this.DAILY_TARGET_KEY) || '120',
                customThemes: safeGetJSON<CustomTheme[]>(this.CUSTOM_THEMES_KEY, []),
                stats: {
                    level: localStorage.getItem(this.LEVEL_KEY) || '1',
                    xp: localStorage.getItem(this.XP_KEY) || '0',
                    streak: localStorage.getItem(this.STREAK_KEY) || '0'
                }
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `focusr-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            throw err;
        }
    },

    restoreBackup(file: File, onSuccess: () => void, onError: (err: any) => void): void {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid JSON payload');
                }

                // Merge sessions without duplicates
                const incomingSessions: SessionData[] = Array.isArray(data.sessions) ? data.sessions : (Array.isArray(data.history) ? data.history : []);
                if (incomingSessions.length > 0) {
                    const existing = this.getAllSessions();
                    const seen = new Set(existing.map(s => s.id || (s.date + '_' + (s.duration || 0))));
                    const toAdd = incomingSessions.filter(s => {
                        const id = s.id || (s.date + '_' + (s.duration || 0));
                        return !seen.has(id);
                    });
                    const merged = existing.concat(toAdd);
                    this.saveAllSessions(merged);
                    if (typeof window !== 'undefined' && (window as any).S) {
                        (window as any).S.sessions = merged;
                    }
                }

                // Merge bottle inventory without duplicates
                if (Array.isArray(data.inventory)) {
                    const existingInv = this.getAllBottles();
                    const seenBottleIds = new Set(existingInv.map(b => b.id));
                    const newBottles = data.inventory.filter((b: BottleItem) => b.id && !seenBottleIds.has(b.id));
                    const mergedInv = existingInv.concat(newBottles);
                    this.saveAllBottles(mergedInv);
                    if (typeof window !== 'undefined' && (window as any).S) {
                        (window as any).S.inventory = mergedInv;
                    }
                }

                if (data.dailyTarget) {
                    localStorage.setItem(this.DAILY_TARGET_KEY, String(data.dailyTarget));
                }

                if (Array.isArray(data.customThemes) && data.customThemes.length > 0) {
                    localStorage.setItem(this.CUSTOM_THEMES_KEY, JSON.stringify(data.customThemes));
                }

                if (data.stats) {
                    if (data.stats.level) localStorage.setItem(this.LEVEL_KEY, String(data.stats.level));
                    if (data.stats.xp) localStorage.setItem(this.XP_KEY, String(data.stats.xp));
                    if (data.stats.streak) localStorage.setItem(this.STREAK_KEY, String(data.stats.streak));
                }

                onSuccess();
            } catch (err) {
                console.error('Restore error:', err);
                onError(err);
            }
        };
        reader.onerror = (err) => onError(err);
        reader.readAsText(file);
    }
};

if (typeof window !== 'undefined') {
    (window as any).LocalDataManager = LocalDataManager;
}
