const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Focusr Team';
pptx.company = 'Focusr Spatial Studio';
pptx.title = 'Focusr — Comprehensive Product Overview & Architecture';
pptx.subject = 'Deep Work Studio, Cosmor 3D Companion, and Cognitive Architecture';

// Visual Design Tokens
const BG_COLOR = '090A0F';
const CARD_BG = '131824';
const CARD_BORDER = '242C40';
const TEXT_WHITE = 'F8FAFC';
const TEXT_MUTED = '94A3B8';
const ACCENT_INDIGO = '6366F1';
const ACCENT_SKY = '38BDF8';
const ACCENT_EMERALD = '34D399';
const ACCENT_PURPLE = 'A855F7';
const ACCENT_GOLD = 'FBBF24';
const ACCENT_ROSE = 'FB7185';

function createBaseSlide(categoryText = 'FOCUSR &bull; SPATIAL DEEP WORK STUDIO') {
  const slide = pptx.addSlide();
  slide.background = { color: BG_COLOR };

  // Top header pill
  slide.addText(categoryText, {
    x: 0.8,
    y: 0.45,
    w: 6.0,
    h: 0.35,
    fontSize: 10,
    fontFace: 'Arial',
    color: ACCENT_SKY,
    bold: true,
    charSpacing: 2
  });

  // Footer bar
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 6.9,
    w: 11.73,
    h: 0,
    line: { color: '1E293B', width: 1 }
  });

  slide.addText('Focusr &bull; Spatial Deep Work &bull; focusr-seven.vercel.app', {
    x: 0.8,
    y: 7.0,
    w: 7.0,
    h: 0.35,
    fontSize: 9,
    fontFace: 'Arial',
    color: '64748B'
  });

  return slide;
}

// ── SLIDE 1: TITLE SLIDE ──
{
  const slide = pptx.addSlide();
  slide.background = { color: BG_COLOR };

  // Glow card
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 0.8,
    w: 11.73,
    h: 5.9,
    fill: { color: '0E1422' },
    line: { color: '243048', width: 1.5 }
  });

  // Badge
  slide.addText('SPATIAL MINIMALIST DEEP WORK STUDIO', {
    x: 1.3,
    y: 1.3,
    w: 6.0,
    h: 0.35,
    fontSize: 11,
    fontFace: 'Arial',
    color: ACCENT_INDIGO,
    bold: true,
    charSpacing: 3
  });

  // Main Title
  slide.addText('Focusr', {
    x: 1.25,
    y: 1.7,
    w: 9.0,
    h: 1.4,
    fontSize: 64,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  // Subtitle
  slide.addText('The Next-Generation Digital Flow Sanctuary with Real-Time Anti-Distraction Shielding & 3D Orbital Co-Pilot', {
    x: 1.3,
    y: 3.1,
    w: 9.5,
    h: 0.8,
    fontSize: 18,
    fontFace: 'Arial',
    color: TEXT_MUTED
  });

  // 3 Feature chips
  const chips = [
    { text: '🛸 3D Three.js Co-Pilot Cosmor', x: 1.3, color: ACCENT_INDIGO },
    { text: '🔒 Universal Super Strict Shield', x: 5.0, color: ACCENT_EMERALD },
    { text: '🌊 Fluid Hydro-Metaphor & Debrief', x: 8.8, color: ACCENT_SKY }
  ];
  chips.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 4.4,
      w: 3.4,
      h: 0.65,
      rectRadius: 0.1,
      fill: { color: '172033' },
      line: { color: '2D3C5E', width: 1 }
    });
    slide.addText(c.text, {
      x: c.x,
      y: 4.4,
      w: 3.4,
      h: 0.65,
      fontSize: 11,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true,
      align: 'center'
    });
  });

  slide.addText('Production Release 2.0 &bull; Live at focusr-seven.vercel.app', {
    x: 1.3,
    y: 5.8,
    w: 8.0,
    h: 0.4,
    fontSize: 10,
    fontFace: 'Arial',
    color: '64748B'
  });
}

// ── SLIDE 2: THE ATTENTION CRISIS ──
{
  const slide = createBaseSlide('THE CHALLENGE &bull; COGNITIVE DRIFT');

  slide.addText('The Attention Crisis in Knowledge Work', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'The 3-Minute Fragmentation Trap',
      stat: '2.8m',
      statLabel: 'Avg time before interruption',
      desc: 'Studies demonstrate knowledge workers switch context or tabs every 2-3 minutes. A single glance at email or chat costs up to 23 minutes of focus recovery.',
      x: 0.8,
      accent: ACCENT_ROSE
    },
    {
      title: 'The Flaw of Passive Timers',
      stat: '74%',
      statLabel: 'Passive timers ignored',
      desc: 'Traditional Pomodoro apps merely tick in the background. They do not prevent tab desertion, detect physical slacking, or measure behavioral flow continuity.',
      x: 4.8,
      accent: ACCENT_GOLD
    },
    {
      title: 'Aesthetic Cognitive Clutter',
      stat: '0 Clutter',
      statLabel: 'Focusr Design Standard',
      desc: 'Noisy UIs, garish alert sounds, and jarring advertisements fracture working memory. Pure flow requires spatial immersion and zero cognitive friction.',
      x: 8.8,
      accent: ACCENT_SKY
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.6,
      fontSize: 16,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.stat, {
      x: c.x + 0.3,
      y: 2.7,
      w: 3.13,
      h: 0.7,
      fontSize: 36,
      fontFace: 'Arial',
      color: c.accent,
      bold: true
    });

    slide.addText(c.statLabel, {
      x: c.x + 0.3,
      y: 3.45,
      w: 3.13,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      bold: true
    });

    slide.addText(c.desc, {
      x: c.x + 0.3,
      y: 3.9,
      w: 3.13,
      h: 2.2,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 3: DESIGN PHILOSOPHY ──
{
  const slide = createBaseSlide('DESIGN SYSTEM &bull; SPATIAL MINIMALISM');

  slide.addText('Spatial Minimalist Design Architecture', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const pillars = [
    {
      title: 'Translucent Glassmorphism',
      tag: 'VISUAL CALM',
      text: 'Multi-layered backdrop blur (40px blur, 180% saturation), subtle 1px specular borders (rgba(255,255,255,0.08)), and organic gradients reduce eye strain during 12+ hour engineering sprints.',
      x: 0.8
    },
    {
      title: '8 Atmospheric Realms',
      tag: 'IMMERSIVE AUDIO-VISUAL',
      text: 'From Zen Mountain Mist to Nordic Aurora, Golden Dunes, and Cosmic Deep Nebula. Custom tint, blur, and opacity controls ground the nervous system in serene stillness.',
      x: 4.8
    },
    {
      title: 'Telemetry Badges & HUD',
      tag: 'ZERO COGNITIVE LOAD',
      text: 'Monospaced telemetry pills report elapsed intervals, daily targets, and pace status without competing for visual dominance. Information appears only when essential.',
      x: 8.8
    }
  ];

  pillars.forEach(p => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: p.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(p.tag, {
      x: p.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_INDIGO,
      bold: true,
      charSpacing: 2
    });

    slide.addText(p.title, {
      x: p.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(p.text, {
      x: p.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 4: THE TRI-MODAL ENGINE ──
{
  const slide = createBaseSlide('CORE CLOCK &bull; TRI-MODAL ADAPTIVE ENGINE');

  slide.addText('Three Modes Engineered for Every Flow State', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const modes = [
    {
      name: 'Custom Duration Timer',
      badge: 'FIXED HORIZON FOCUS',
      icon: '⏱️',
      desc: 'Set custom hours & minutes (0 to 23h 59m) with one-click presets (15m, 25m, 45m, 60m, 90m). Ideal for time-boxed sprints, essay drafting, and deep problem solving.',
      metric: 'Milestones at 25%, 50%, 75%, 90%',
      x: 0.8,
      color: ACCENT_SKY
    },
    {
      name: 'Spatial Pomodoro',
      badge: 'INTERVAL CYCLING',
      icon: '⏳',
      desc: 'Work cycles (5–120m), short breaks (1–30m), long breaks (5–60m), and customizable rounds (1–12). Features automatic break transitions and one-click Skip Break.',
      metric: 'No tomatoes &bull; Pure minimalist ring',
      x: 4.8,
      color: ACCENT_INDIGO
    },
    {
      name: 'Open-Ended Stopwatch',
      badge: 'UNCONSTRAINED FLOW',
      icon: '⏲️',
      desc: 'Count-up timer for infinite deep work. Dynamically fills a new 1-hour focus water bottle every 60 minutes with special audio-haptic celebrations at 30, 60, 90, and 120m.',
      metric: '1 Hour = 1 Sealed Bottle of Focus',
      x: 8.8,
      color: ACCENT_EMERALD
    }
  ];

  modes.forEach(m => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: m.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(`${m.icon}  ${m.badge}`, {
      x: m.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: m.color,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(m.name, {
      x: m.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.6,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(m.desc, {
      x: m.x + 0.3,
      y: 3.1,
      w: 3.13,
      h: 2.0,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: m.x + 0.3,
      y: 5.4,
      w: 3.13,
      h: 0.7,
      rectRadius: 0.08,
      fill: { color: '1C2436' }
    });

    slide.addText(m.metric, {
      x: m.x + 0.3,
      y: 5.4,
      w: 3.13,
      h: 0.7,
      fontSize: 10,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true,
      align: 'center'
    });
  });
}

// ── SLIDE 5: SUPER STRICT MODE ──
{
  const slide = createBaseSlide('COGNITIVE SHIELD &bull; ACTIVE DEFENSE');

  slide.addText('Super Strict Mode & Tab Telemetry Guard', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Anti-Slacking Idle Detection',
      tag: 'ACTIVE KEYBOARD/MOUSE CAPTURE',
      text: 'Tracks continuous user input across all DOM elements with high-priority capture phase listeners. If zero input is registered for 35s, the session clock immediately halts, and a crimson alert overlay prompts user re-engagement.',
      x: 0.8,
      accent: ACCENT_ROSE
    },
    {
      title: 'Tab & Window Desertion Penalties',
      tag: 'COGNITIVE LEAK PREVENTION',
      text: 'Switching away to other applications or abandoning the tab auto-pauses the session and applies an immediate +10% time penalty directly to the session clock (min 30s penalty). Distraction costs real time.',
      x: 4.8,
      accent: ACCENT_GOLD
    },
    {
      title: 'Piercing Wake-Up Siren',
      tag: 'AUDITORY INTERVENTION',
      text: 'Optional loud multi-burst siren synthesized via Web Audio Dynamics Compressor. If idle exceeds 2 minutes, an alternating high-intensity alarm triggers to pull the user out of procrastination.',
      x: 8.8,
      accent: ACCENT_INDIGO
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: c.accent,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 6: COSMOR 3D COMPANION ──
{
  const slide = createBaseSlide('AI COMPANION &bull; THREE.JS ARCHITECTURE');

  slide.addText('Cosmor &bull; The 3D Orbital Desktop Companion', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Full 3D Procedural Mesh',
      tag: 'THREE.JS / WEBGL ENGINE',
      text: 'Modeled entirely via Three.js primitives without external model downloads: capsule minion torso, denim overalls, goggle frame, eye pupil with dynamic state textures, thruster exhaust, and rocket fins.',
      x: 0.8
    },
    {
      title: 'Smooth Orbital Center Flips',
      tag: 'PARAMETRIC FLIP PHYSICS',
      text: 'Rather than rotating in place, Cosmor orbits around an imaginary anchor point with sinusoidal pitch and roll tangent alignment, executing a true 360&deg; zero-gravity acrobatic loop upon celebratory triggers.',
      x: 4.8
    },
    {
      title: 'Dual Operating Modes',
      tag: 'COMPANION VS COURIER',
      text: 'Switch between "Companion Mode" (actively hovering beside your timer at all times) and "Courier Mode" (flies onto screen only to deliver motivational milestone telemetry, then smoothly exits).',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_SKY,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 7: SPOTIFY SANCTUARY ──
{
  const slide = createBaseSlide('ACOUSTIC SANCTUARY &bull; MUSIC INTEGRATION');

  slide.addText('Spotify Focus Music Sanctuary', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: '6 Curated Focus Presets',
      tag: 'ZERO SETUP PLAYBACK',
      text: 'One-tap access to hand-curated playlists: Lofi Beats & Chill, Deep Focus Flow, Classical Concentration, Synthwave Cyberflow, Nature & Alpha Drone, and Peaceful Piano.',
      x: 0.8
    },
    {
      title: 'Custom URL & URI Resolver',
      tag: 'PERSONAL FLOW PLAYLISTS',
      text: 'Paste any Spotify playlist, album, or track URL (or raw spotify:playlist:... URI). Focusr automatically normalizes and loads the player into an ambient glass embed.',
      x: 4.8
    },
    {
      title: 'OAuth PKCE Live Connect',
      tag: 'PLAYBACK TELEMETRY HUD',
      text: 'Optional direct Spotify Web API OAuth connection with Authorization Code Flow with PKCE. Control playback, view live track metadata, and auto-open music upon timer start.',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_EMERALD,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 8: LIQUID SIMULATION & INVENTORY ──
{
  const slide = createBaseSlide('GAMIFICATION &bull; PHYSICAL HYDRO-METAPHOR');

  slide.addText('Liquid Simulation & Glass Bottle Inventory', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Physics-Based Spring Waves',
      tag: 'CANVAS FLUID DYNAMICS',
      text: '30 interconnected spring nodes simulate real water surface tension, responsive sloshing, sub-surface rising bubbles, and dynamic splash droplets that react to timer progress.',
      x: 0.8
    },
    {
      title: 'Cork Sealing & Shimmer Animation',
      tag: 'TANGIBLE COMPLETION RITUAL',
      text: 'Upon completing a focus session or 1-hour block, a wooden cork descends into the bottle neck, and a specular light shimmer sweeps across the glass with a celebratory chime.',
      x: 4.8
    },
    {
      title: 'Glass Inventory Shelf',
      tag: 'LONG-TERM MOMENTUM',
      text: 'Filled bottles are banked in a slide-out glass inventory rack with theme-specific liquid hues. Users track cumulative focus volume (e.g. 14.5L of Pure Focus Water banked).',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_SKY,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 9: RETROSPECTIVE DEBRIEF ──
{
  const slide = createBaseSlide('AI COACHING &bull; RETROSPECTIVE TELEMETRY');

  slide.addText('Post-Session Retrospective Debrief Sheet', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Flow Purity Metric (0–100%)',
      tag: 'OBJECTIVE QUALITY SCORE',
      text: 'Calculates session grade (S, A, B, C, D) using a weighted algorithm penalizing tab desertions (-12%), idle stalls (-8%), loud alarm triggers (-10%), and manual pauses (-5%).',
      x: 0.8
    },
    {
      title: 'Disruption & Friction Audit',
      tag: 'BEHAVIORAL TRANSPARENCY',
      text: 'Lists every distraction event with timestamps, exact penalty debts, and causal details (e.g. "Window Desertion: Switched to browser search for 45s (+1m penalty added)").',
      x: 4.8
    },
    {
      title: 'Cosmor Pep Talk & Recommendations',
      tag: 'ACTIONABLE COACHING',
      text: 'Delivers personalized constructive encouragement and telemetry-grounded suggestions for the next block (e.g. "Pre-open research tabs to eliminate mid-sprint window hops").',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_PURPLE,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 10: GHOST RACER PACING ──
{
  const slide = createBaseSlide('ADAPTIVE BENCHMARK &bull; GHOST RACER');

  slide.addText('Ghost Rival & Pacing Engine', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Pacing Against Your Past Self',
      tag: 'ASYNCHRONOUS BENCHMARKING',
      text: 'Rather than competing with random strangers, Ghost Racer compares your current rhythm against your historical Personal Best (PB) or 7-day average pace.',
      x: 0.8
    },
    {
      title: '3 Dynamic Difficulty Tiers',
      tag: 'ADAPTIVE CHALLENGE',
      text: 'Choose your pacing opponent:\n&bull; 🏆 PB Pace (1.0x Personal Best)\n&bull; ⚖️ Weekly Avg (Smooth endurance pace)\n&bull; ⚡ Apex (+8% Overdrive Challenge)',
      x: 4.8
    },
    {
      title: 'Live Cockpit HUD & Overtakes',
      tag: 'IN-FLIGHT TELEMETRY',
      text: 'Floating HUD widget displays live distance lead/lag. Slacking or deserting gives the Ghost rival a boost, while consistent input maintains the lead for a trophy victory.',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_GOLD,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 11: PRIVACY & DATA SYNC ──
{
  const slide = createBaseSlide('DATA ARCHITECTURE &bull; PRIVACY FIRST');

  slide.addText('Optional Account Linking & Local-First Sovereignty', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Zero Mandatory Login',
      tag: 'INSTANT ACCESS',
      text: 'Users never encounter a login paywall. All sessions, inventory bottles, streak calculations, and preferences persist in browser LocalStorage by default.',
      x: 0.8
    },
    {
      title: 'Optional Multi-Device Linking',
      tag: 'CROSS-PLATFORM SYNC',
      text: 'Users desiring multi-device sync can optionally link via Google or Email. Data synchronizes across devices without intrusive passwords or forced sign-ins.',
      x: 4.8
    },
    {
      title: 'One-Click JSON Backup',
      tag: 'DATA SOVEREIGNTY',
      text: 'Export complete historical packages anytime with one click. Complete transparency and portability with zero vendor lock-in.',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_EMERALD,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 12: TECHNICAL ARCHITECTURE ──
{
  const slide = createBaseSlide('UNDER THE HOOD &bull; ENGINEERING EXCELLENCE');

  slide.addText('High-Performance Web Architecture', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  const cards = [
    {
      title: 'Zero Heavy Frameworks',
      tag: 'VANILLA JS / ES6+',
      text: 'Sub-millisecond startup time with zero React, Vue, or Webpack runtime overhead. Fast initial load, tiny network footprint, and rock-solid memory management.',
      x: 0.8
    },
    {
      title: 'Hardware-Accelerated 3D & 2D',
      tag: 'THREE.JS & CANVAS',
      text: 'Procedural WebGL rendering runs at silky 60fps. DPR scaling and transform matrix normalization guarantee pixel-sharp visual rendering across 4K and Retina displays.',
      x: 4.8
    },
    {
      title: 'Native Browser APIs',
      tag: 'WEB STANDARDS',
      text: 'Web Audio API synthesizers, System Notification API, Fullscreen & Keyboard Lock API, VisibilityState listeners, and robust fallback error boundaries.',
      x: 8.8
    }
  ];

  cards.forEach(c => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: c.x,
      y: 1.7,
      w: 3.73,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText(c.tag, {
      x: c.x + 0.3,
      y: 2.0,
      w: 3.13,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Arial',
      color: ACCENT_INDIGO,
      bold: true,
      charSpacing: 1.5
    });

    slide.addText(c.title, {
      x: c.x + 0.3,
      y: 2.4,
      w: 3.13,
      h: 0.7,
      fontSize: 18,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(c.text, {
      x: c.x + 0.3,
      y: 3.3,
      w: 3.13,
      h: 2.8,
      fontSize: 12,
      fontFace: 'Arial',
      color: TEXT_MUTED,
      lineSpacing: 18
    });
  });
}

// ── SLIDE 13: PRODUCTION ACCESS & CONCLUSION ──
{
  const slide = createBaseSlide('LIVE PRODUCTION &bull; GETTING STARTED');

  slide.addText('Experience Focusr Today', {
    x: 0.8,
    y: 0.85,
    w: 11.0,
    h: 0.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  // Hero Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.7,
    w: 11.73,
    h: 4.8,
    rectRadius: 0.12,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1.5 }
  });

  slide.addText('Live Web App & Global Access', {
    x: 1.3,
    y: 2.1,
    w: 10.5,
    h: 0.5,
    fontSize: 22,
    fontFace: 'Arial',
    color: TEXT_WHITE,
    bold: true
  });

  slide.addText('Focusr is deployed globally on high-speed edge infrastructure with zero setup required.', {
    x: 1.3,
    y: 2.7,
    w: 10.5,
    h: 0.4,
    fontSize: 14,
    fontFace: 'Arial',
    color: TEXT_MUTED
  });

  const links = [
    { title: 'Production App URL', url: 'https://focusr-seven.vercel.app', desc: 'Full application & companion experience' },
    { title: 'Brand Posters Showcase', url: 'https://focusr-seven.vercel.app/posters.html', desc: 'Spatial minimalist promotional suite' },
    { title: 'Interactive Slide Deck', url: 'https://focusr-seven.vercel.app/deck.html', desc: 'Presentation deck & slide showcase' },
    { title: 'GitHub Open Repository', url: 'https://github.com/sanjog-code/focusr', desc: 'Source code & technical documentation' }
  ];

  links.forEach((l, idx) => {
    const lx = 1.3 + (idx % 2) * 5.4;
    const ly = 3.4 + Math.floor(idx / 2) * 1.3;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: lx,
      y: ly,
      w: 5.1,
      h: 1.1,
      rectRadius: 0.08,
      fill: { color: '172033' },
      line: { color: '24324D', width: 1 }
    });

    slide.addText(l.title, {
      x: lx + 0.25,
      y: ly + 0.15,
      w: 4.6,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Arial',
      color: ACCENT_SKY,
      bold: true
    });

    slide.addText(l.url, {
      x: lx + 0.25,
      y: ly + 0.45,
      w: 4.6,
      h: 0.3,
      fontSize: 11,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true
    });

    slide.addText(l.desc, {
      x: lx + 0.25,
      y: ly + 0.75,
      w: 4.6,
      h: 0.25,
      fontSize: 9,
      fontFace: 'Arial',
      color: TEXT_MUTED
    });
  });
}

// Generate the PPTX File
const outputPath = path.join(__dirname, 'Focusr_Comprehensive_Overview.pptx');
const appAssetPath = 'C:\\Users\\amans\\.gemini\\antigravity\\scratch\\focus-app\\assets\\Focusr_Comprehensive_Overview.pptx';

pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('Successfully wrote PPTX to:', outputPath);
  // Copy to focus-app assets as well
  fs.copyFileSync(outputPath, appAssetPath);
  console.log('Successfully copied PPTX to webapp assets:', appAssetPath);
}).catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
