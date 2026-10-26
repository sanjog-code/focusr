export interface SessionData {
    id: string;
    startTime?: number;
    endTime?: number;
    completedAt?: string;
    duration: number; // in milliseconds
    category: string;
    mode: 'timer' | 'stopwatch' | 'pomodoro';
    pomodoros?: number;
    strict?: boolean;
    flowPurity?: number;
    infractions?: number;
    note?: string;
    friction?: string;
    nextAction?: string;
    splitMs?: number;
    pacingMode?: string;
    date: string;
    [key: string]: any;
}

export interface BottleItem {
    id: string;
    name: string;
    unlockedAt: string;
    color: string;
    accent: string;
    category?: string;
}

export interface UserAccount {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    provider: 'google' | 'email';
    linkedAt: string;
}

export interface CustomTheme {
    id: string;
    name: string;
    bgUrl?: string;
    primary: string;
    accent: string;
    glassBg: string;
    createdAt: string;
}

export interface PacingProfile {
    name: string;
    speedMult: number;
    subtitle: string;
    diff: 'pb' | 'avg' | 'balanced' | 'ai';
    metrics: {
        bestDurationMs: number;
        avgDurationMs: number;
        weeklySessions: number;
        totalSessions: number;
        winRate: number;
        isRookie?: boolean;
    };
}
