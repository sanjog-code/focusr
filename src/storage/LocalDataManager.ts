import { SessionData, BottleItem, CustomTheme, UserAccount } from '../types';

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
    HISTORY_KEY: 'focusr_history',
    INVENTORY_KEY: 'focusr_bottle_inventory',
    DAILY_TARGET_KEY: 'focusr_daily_target_minutes',
    CUSTOM_THEMES_KEY: 'focusr_custom_themes',
    LEVEL_KEY: 'focusr_level',
    XP_KEY: 'focusr_xp',
    STREAK_KEY: 'focusr_streak',

    exportBackup(): void {
        try {
            const data = {
                version: 2,
                exportedAt: new Date().toISOString(),
                user: safeGetJSON<UserAccount | null>(this.USER_KEY, null),
                sessions: safeGetJSON<SessionData[]>(this.SESSIONS_KEY, safeGetJSON(this.HISTORY_KEY, [])),
                inventory: safeGetJSON<BottleItem[]>(this.INVENTORY_KEY, []),
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
                    const existing = safeGetJSON<SessionData[]>(this.SESSIONS_KEY, safeGetJSON<SessionData[]>(this.HISTORY_KEY, []));
                    const seen = new Set(existing.map(s => s.id || (s.date + '_' + s.startTime)));
                    const toAdd = incomingSessions.filter(s => {
                        const id = s.id || (s.date + '_' + s.startTime);
                        return !seen.has(id);
                    });
                    const merged = existing.concat(toAdd);
                    safeSetJSON(this.SESSIONS_KEY, merged);
                    safeSetJSON(this.HISTORY_KEY, merged);
                }

                // Merge bottle inventory without duplicates
                if (Array.isArray(data.inventory)) {
                    const existingInv = safeGetJSON<BottleItem[]>(this.INVENTORY_KEY, []);
                    const seenBottleIds = new Set(existingInv.map(b => b.id));
                    const newBottles = data.inventory.filter((b: BottleItem) => b.id && !seenBottleIds.has(b.id));
                    safeSetJSON(this.INVENTORY_KEY, existingInv.concat(newBottles));
                }

                if (data.dailyTarget) {
                    localStorage.setItem(this.DAILY_TARGET_KEY, String(data.dailyTarget));
                }

                if (Array.isArray(data.customThemes) && data.customThemes.length > 0) {
                    safeSetJSON(this.CUSTOM_THEMES_KEY, data.customThemes);
                }

                onSuccess();
            } catch (err) {
                onError(err);
            }
        };
        reader.readAsText(file);
    }
};

if (typeof window !== 'undefined') {
    (window as any).LocalDataManager = LocalDataManager;
}
