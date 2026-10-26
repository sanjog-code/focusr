import './styles/main.css';
import { AudioMaster, soundClick, soundComplete, soundWaterDrop, playTone, playLoudWakeupAlarm } from './audio/AudioMaster';
import { BinauralEngine } from './audio/BinauralEngine';
import { TimerHeartbeat } from './engine/TimerHeartbeat';
import { PacingPartner } from './engine/PacingPartner';
import { LocalDataManager } from './storage/LocalDataManager';
import { ZenMode } from './ui/ZenMode';
import { Modals } from './ui/Modals';
import { CosmoCompanion } from './canvas/CosmoCompanion';

console.log('🚀 Focusr 2.0 Studio initialized with modular architecture');

// Expose singletons cleanly to window for backward compatibility and interop
if (typeof window !== 'undefined') {
    (window as any).AudioMaster = AudioMaster;
    (window as any).BinauralEngine = BinauralEngine;
    (window as any).TimerHeartbeat = TimerHeartbeat;
    (window as any).PacingPartner = PacingPartner;
    (window as any).GhostPredictionModel = PacingPartner;
    (window as any).LocalDataManager = LocalDataManager;
    (window as any).ZenMode = ZenMode;
    (window as any).Modals = Modals;
    (window as any).Cosmo = CosmoCompanion;
    (window as any).Cosmor = CosmoCompanion;
    (window as any).soundClick = soundClick;
    (window as any).soundComplete = soundComplete;
    (window as any).soundWaterDrop = soundWaterDrop;
    (window as any).playTone = playTone;
    (window as any).playLoudWakeupAlarm = playLoudWakeupAlarm;
}

// Bootstrap modern modules upon DOM readiness
document.addEventListener('DOMContentLoaded', () => {
    ZenMode.init();
    Modals.init();
    BinauralEngine.init();
    
    // Connect Cosmo Companion if stage exists
    if (document.getElementById('cosmo-canvas')) {
        CosmoCompanion.init();
    }
});
