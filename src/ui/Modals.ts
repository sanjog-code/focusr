/**
 * Modals: Manages Support Atelier, Spotify, Account, and Settings overlays
 */
export const Modals = {
    openSupportAtelier(): void {
        const modal = document.getElementById('support-atelier-modal');
        const backdrop = document.getElementById('support-atelier-backdrop');
        if (modal && backdrop) {
            modal.classList.add('active');
            backdrop.classList.add('active');
        }
    },

    closeSupportAtelier(): void {
        const modal = document.getElementById('support-atelier-modal');
        const backdrop = document.getElementById('support-atelier-backdrop');
        if (modal && backdrop) {
            modal.classList.remove('active');
            backdrop.classList.remove('active');
        }
    },

    init(): void {
        // Close on backdrop clicks
        const backdrop = document.getElementById('support-atelier-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeSupportAtelier();
            });
        }

        const closeBtn = document.getElementById('btn-close-support-atelier');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSupportAtelier());
        }

        const openBtn = document.getElementById('menu-item-support');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openSupportAtelier());
        }
    }
};

if (typeof window !== 'undefined') {
    (window as any).Modals = Modals;
}
