import './styles/main.css';
import { AudioMaster, soundClick, soundComplete, soundWaterDrop, playTone, playLoudWakeupAlarm } from './audio/AudioMaster';
import { BinauralEngine } from './audio/BinauralEngine';
import { TimerHeartbeat } from './engine/TimerHeartbeat';
import { PacingPartner } from './engine/PacingPartner';
import { LiveWallpaperManager } from './engine/LiveWallpaperManager';
import { LocalDataManager } from './storage/LocalDataManager';
import { FocusrMediaDB } from './storage/FocusrMediaDB';
import { ZenMode } from './ui/ZenMode';
import { Modals } from './ui/Modals';
import { CosmoCompanion } from './canvas/CosmoCompanion';
import ToastManager from './ui/ToastManager';

console.log('🚀 Focusr 2.0 Studio initialized with modular architecture');

// Expose singletons cleanly to window for backward compatibility and interop
if (typeof window !== 'undefined') {
    (window as any).AudioMaster = AudioMaster;
    (window as any).BinauralEngine = BinauralEngine;
    (window as any).TimerHeartbeat = TimerHeartbeat;
    (window as any).PacingPartner = PacingPartner;
    (window as any).GhostPredictionModel = PacingPartner;
    (window as any).LiveWallpaperManager = LiveWallpaperManager;
    (window as any).LocalDataManager = LocalDataManager;
    (window as any).FocusrMediaDB = FocusrMediaDB;
    (window as any).ZenMode = ZenMode;
    (window as any).Modals = Modals;
    if (!(window as any).Cosmo) {
        (window as any).Cosmo = CosmoCompanion;
    }
    if (!(window as any).Cosmor) {
        (window as any).Cosmor = CosmoCompanion;
    }
    (window as any).soundClick = soundClick;
    (window as any).soundComplete = soundComplete;
    (window as any).soundWaterDrop = soundWaterDrop;
    (window as any).playTone = playTone;
    (window as any).playLoudWakeupAlarm = playLoudWakeupAlarm;
}

// Bootstrap modern modules upon DOM readiness
  /* Duplicate init removed – legacy listeners handled once */
    LiveWallpaperManager.init();
    ZenMode.init();
    Modals.init();
    BinauralEngine.init();
    // Initialize cursor forcefield
    if (typeof (window as any).CursorForcefield !== 'undefined') {
      (window as any).CursorForcefield.init();
    }
    // Sync forcefield with Zen mode toggles
    window.addEventListener('focusr:zen-toggle', (e: CustomEvent) => {
      const active = e.detail?.active;
      if (typeof (window as any).CursorForcefield !== 'undefined') {
        (window as any).CursorForcefield.setActive(!active);
      }
    });
    // Connect Cosmo Companion if stage exists and not already initialized
    if (document.getElementById('cosmo-canvas')) {
      const c = (window as any).Cosmo || CosmoCompanion;
      if (c && typeof c.init === 'function' && !c.renderer) {
        c.init();
      }
    }
  });
/* Duplicate init removed – legacy listeners handled once */
    LiveWallpaperManager.init();
    ZenMode.init();
    Modals.init();
    BinauralEngine.init();
    
    // Connect Cosmo Companion if stage exists and not already initialized
    if (document.getElementById('cosmo-canvas')) {
        const c = (window as any).Cosmo || CosmoCompanion;
        if (c && typeof c.init === 'function' && !c.renderer) {
            c.init();
        }
    }
});
