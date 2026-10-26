/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface Window {
  AudioMaster: any;
  BinauralEngine: any;
  TimerHeartbeat: any;
  PacingPartner: any;
  GhostPredictionModel: any;
  LocalDataManager: any;
  ZenMode: any;
  Modals: any;
  Cosmo: any;
  Cosmor: any;
  soundClick: any;
  soundComplete: any;
  soundWaterDrop: any;
  playTone: any;
  playLoudWakeupAlarm: any;
}
