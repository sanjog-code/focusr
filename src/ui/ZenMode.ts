import { AudioMaster } from '../audio/AudioMaster';

/**
 * ZenMode: Controls ultra-calm, battery-saving distraction-free spatial environment,
 * WebGL render loop pause, pure obsidian flat backdrop, and telemetry decluttering.
 */
export const ZenMode = {
    STORAGE_KEY: 'focusr_zen_mode',
    isActive: false,

    init(): void {
        try {
            this.isActive = localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            this.isActive = false;
        }

        // Apply initial state
        this.apply(this.isActive);

        // Bind Focus screen toggle pill
        const btnFocus = document.getElementById('btn-toggle-zen');
        if (btnFocus) {
            btnFocus.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        // Bind Setup screen switch
        const toggleSetup = document.getElementById('toggle-zen-default') as HTMLInputElement | null;
        if (toggleSetup) {
            toggleSetup.checked = this.isActive;
            toggleSetup.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.set(target.checked);
            });
        }

        // Bind Keyboard shortcut: 'Z' or 'Alt+Z'
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            // Ignore if active typing inside text inputs, textareas, or contenteditables
            const activeTag = (document.activeElement?.tagName || '').toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
                return;
            }

            if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.toggle();
            }
        });

        // Global interval to enforce strict No-Ad Zone and sync Zen Status Line
        this.enforceNoAdZone();
        setInterval(() => {
            if (this.isActive) {
                this.updateZenStatusLine();
            }
        }, 1000);
    },

    toggle(): boolean {
        return this.set(!this.isActive);
    },

    set(active: boolean): boolean {
        this.isActive = !!active;
        try {
            localStorage.setItem(this.STORAGE_KEY, String(this.isActive));
        } catch {}

        this.apply(this.isActive);
        return this.isActive;
    },

    apply(active: boolean): void {
        this.isActive = active;
        document.body.classList.toggle('zen-mode', active);

        // Sync Focus screen toggle pill
        const btnFocus = document.getElementById('btn-toggle-zen');
        if (btnFocus) {
            btnFocus.classList.toggle('active', active);
            btnFocus.setAttribute('aria-pressed', String(active));
            btnFocus.innerHTML = active
                ? '<span>✦ Zen Active</span>'
                : '<span>✦ Zen Mode</span>';
        }

        // Sync Setup screen switch
        const toggleSetup = document.getElementById('toggle-zen-default') as HTMLInputElement | null;
        if (toggleSetup && toggleSetup.checked !== active) {
            toggleSetup.checked = active;
        }

        // 1. Hardware & Battery Optimization: WebGL Engine Sleep
        const cosmoStage = document.getElementById('cosmo-stage');
        if (cosmoStage) {
            if (active) {
                cosmoStage.style.setProperty('display', 'none', 'important');
            } else {
                cosmoStage.style.removeProperty('display');
            }
        }

        // 2. Immediately invoke Cosmo.pause() / cancelAnimationFrame
        if ((window as any).Cosmo && typeof (window as any).Cosmo.setPaused === 'function') {
            (window as any).Cosmo.setPaused(active);
        } else if ((window as any).Cosmo && typeof (window as any).Cosmo.pauseLoop === 'function' && active) {
            (window as any).Cosmo.pauseLoop();
        }

        // 3. Play subtle calm feedback chime when activating / deactivating
        if (active && typeof (window as any).playTone === 'function') {
            (window as any).playTone([440, 554, 659], 0.35, 0.12);
        }

        // 4. Update Zen Monospaced Status Line
        this.updateZenStatusLine();

        // 5. Broadcast event for other systems
        window.dispatchEvent(new CustomEvent('focusr:zen-toggle', { detail: { active } }));
    },

    updateZenStatusLine(): void {
        const statusEl = document.getElementById('zen-status-line');
        if (!statusEl) return;

        const timerDisplay = document.getElementById('timer-display');
        const timeStr = timerDisplay?.textContent?.trim() || '25:00';

        const catNameEl = document.getElementById('focus-cat-name');
        const catName = catNameEl?.textContent?.trim() || 'Deep Work';

        // Check active mode or sprint count
        let sprintStr = 'Sprint 01';
        const S = (window as any).S;
        if (S && S.mode === 'pomodoro') {
            const currentRound = S.pomoCurrent || 1;
            const roundPadded = String(currentRound).padStart(2, '0');
            sprintStr = S.pomoIsBreak ? `Rest ${roundPadded}` : `Sprint ${roundPadded}`;
        }

        statusEl.textContent = `${timeStr} · ${catName} · ${sprintStr}`;
    },

    enforceNoAdZone(): void {
        const purgeAds = () => {
            const focusScreen = document.getElementById('s-focus');
            if (focusScreen) {
                const adSlots = focusScreen.querySelectorAll('.focusr-ad-slot, [data-ad-slot], .ad-banner, .sponsor-slot');
                adSlots.forEach(slot => {
                    (slot as HTMLElement).style.setProperty('display', 'none', 'important');
                });
            }
        };

        purgeAds();
        setInterval(purgeAds, 3000);
    }
};

if (typeof window !== 'undefined') {
    (window as any).ZenMode = ZenMode;
}
