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

export type LiveWallpaperType = 'video' | 'shader' | 'particles' | 'none';
export type LiveShaderPreset = 'cosmic-void' | 'aurora-waves' | 'cyber-rain' | 'zen-ripples';
export type LiveParticlePreset = 'rain' | 'snow' | 'embers' | 'stardust' | 'petals' | 'none';

export interface CustomTheme {
    id: string;
    name: string;
    bgUrl?: string;
    primary: string;
    accent: string;
    glassBg: string;
    createdAt: string;
    liveType?: LiveWallpaperType;
    videoUrl?: string;
    shaderPreset?: LiveShaderPreset;
    particlePreset?: LiveParticlePreset;
}

export interface LiveThemeDefinition {
    id: string;
    name: string;
    sub: string;
    category: string;
    image: string;
    liveType?: LiveWallpaperType;
    videoUrl?: string;
    shaderPreset?: LiveShaderPreset;
    particlePreset?: LiveParticlePreset;
    accent: string;
    accentGlow: string;
    liquidHue: number;
    tint: string;
    orb1: string;
    orb2: string;
    orb3: string;
    palette: string[];
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
