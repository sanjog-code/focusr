/**
 * ZenMode: Controls distraction-free spatial environment and WebGL render pause
 */
export const ZenMode = {
    STORAGE_KEY: 'focusr_zen_mode',
    isActive: false,

    init(): void {
        this.isActive = localStorage.getItem(this.STORAGE_KEY) === 'true';
        this.apply(this.isActive);

        const btn = document.getElementById('btn-toggle-zen');
        if (btn) {
            btn.addEventListener('click', () => {
                this.toggle();
            });
        }
    },

    toggle(): boolean {
        this.isActive = !this.isActive;
        try {
            localStorage.setItem(this.STORAGE_KEY, String(this.isActive));
        } catch {}
        this.apply(this.isActive);
        return this.isActive;
    },

    apply(active: boolean): void {
        this.isActive = active;
        document.body.classList.toggle('zen-mode', active);

        const btn = document.getElementById('btn-toggle-zen');
        if (btn) {
            btn.classList.toggle('active', active);
            const label = btn.querySelector('.zen-btn-label');
            if (label) label.textContent = active ? 'Zen Active' : 'Zen Mode';
        }

        // Pause / Resume Three.js canvas rendering
        if ((window as any).Cosmo && typeof (window as any).Cosmo.setPaused === 'function') {
            (window as any).Cosmo.setPaused(active);
        }

        // Broadcast event for ambient systems
        window.dispatchEvent(new CustomEvent('focusr:zen-toggle', { detail: { active } }));
    }
};

if (typeof window !== 'undefined') {
    (window as any).ZenMode = ZenMode;
}
