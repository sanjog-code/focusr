# Focusr ⏱💧

An Apple spatial & minimalist focus web application featuring customizable Timer, Stopwatch, and Pomodoro modes with an ultra-realistic water droplet physics engine and focus hour inventory.

## Features

- ⏱ **3 Focus Modes**:
  - **Timer Mode**: Custom countdown duration with fluid progress.
  - **Stopwatch Mode**: Open-ended tracking where 1 hour of focus fills 1 full bottle of focus water and transfers it to your inventory shelf.
  - **Pomodoro Mode**: Work, short break, and long break intervals with round tracking.
- 💧 **Ultra-Realistic Water Dropping Animation**:
  - HTML5 Canvas fluid simulation with spring-mass surface wave dynamics.
  - Surface tension pinch-off droplets, parabolic splash droplets, and rising micro-bubbles.
  - Procedural Web Audio droplet "plop" sounds with air-column resonance pitch shifting.
  - Dynamically modulated drop rates (rapid stream vs. gradual meditative droplets based on duration).
- 🍾 **Water Inventory Shelf**:
  - Collects bottled focus hours (1 Bottle = 1 Hour of deep work).
  - Cork stopper sealing celebration and animated transfer into the spatial glass side shelf.
  - Tracks total liters and completed bottles across sessions.
- 🔒 **Anti-Distraction & Tab Lock**:
  - Fullscreen Keyboard Lock API (`navigator.keyboard.lock()`).
  - Key interceptor for `Ctrl+T`, `Ctrl+N`, `Ctrl+W`, `F5`, and `Ctrl+R`.
  - Tab switch detector with audio warning, flashing tab title, and distraction tracking.
- 📊 **Real-time Analytics**:
  - Today's focus time, streaks, sessions, completed Pomodoros, and bottles filled.
  - 7-day weekly bar chart and session history stored in `localStorage`.
- 🪟 **Apple Spatial Glass Aesthetics**:
  - Ultra-crisp glassmorphism (`backdrop-filter: blur(40px)`).
  - Floating ambient gradient orbs.

## Presentations, Slide Decks & Growth Assets

A complete catalog of business pitches, product decks, interactive presentations, and marketing posters is documented in [PRESENTATIONS_AND_ASSETS.md](file:///C:/Users/amans/.gemini/antigravity/scratch/focus-app/PRESENTATIONS_AND_ASSETS.md):

- 📊 [**Monetization & Growth Masterplan PPTX (17 Slides)**](https://focusr-seven.vercel.app/assets/Focusr_Monetization_and_Growth_Masterplan.pptx)
- 🖥️ [**Product Overview & Architecture PPTX (13 Slides)**](https://focusr-seven.vercel.app/assets/Focusr_Comprehensive_Overview.pptx)
- 🌐 [**Interactive Web Slide Deck (26 Slides)**](https://focusr-seven.vercel.app/deck.html)
- 🖼️ [**Spatial Marketing Posters & Scannable QR Codes**](https://focusr-seven.vercel.app/posters.html)
- 📄 [**Written Monetization & Growth Masterplan Document**](file:///C:/Users/amans/.gemini/antigravity/scratch/focus-app/Focusr_Monetization_and_Growth_Masterplan.md)

## Running Locally

Simply open `index.html` in any modern web browser or run:

```bash
# Windows Standalone Chromeless App Window (Zero Tabs)
launch-focus-app.bat
```

