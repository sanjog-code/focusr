import * as THREE from 'three';
import { LiveThemeDefinition, LiveWallpaperType, LiveShaderPreset, LiveParticlePreset } from '../types/index';
import { FocusrMediaDB, StoredVideoRecord } from '../storage/FocusrMediaDB';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    alphaSpeed: number;
    color: string;
    sway?: number;
    swaySpeed?: number;
    rotation?: number;
    rotSpeed?: number;
    aspect?: number;
}

interface Meteor {
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    length: number;
    alpha: number;
}

export const LiveWallpaperManager = {
    // DOM Elements
    videoEl: null as HTMLVideoElement | null,
    canvasEl: null as HTMLCanvasElement | null,
    particlesEl: null as HTMLCanvasElement | null,
    imageEl: null as HTMLElement | null,

    // Three.js State for Shader/Canvas Engine
    threeScene: null as THREE.Scene | null,
    threeCamera: null as THREE.PerspectiveCamera | null,
    threeRenderer: null as THREE.WebGLRenderer | null,
    threeMesh: null as THREE.Object3D | null,
    threeAnimationId: 0,
    isThreeRendering: false,
    activeShaderPreset: 'none' as LiveShaderPreset | 'none',
    shaderTime: 0,

    // Special Shader Sub-Systems
    auroraPlanes: [] as THREE.Mesh[],
    blackHoleParticles: null as { points: THREE.Points; radii: Float32Array; angles: Float32Array; speeds: Float32Array } | null,
    meteors: [] as Meteor[],
    meteorMesh: null as THREE.LineSegments | null,
    matrixColumns: [] as { x: number; y: number; speed: number; len: number }[],

    // 2D Particle Engine State
    particlesCtx: null as CanvasRenderingContext2D | null,
    particlesList: [] as Particle[],
    particlesAnimationId: 0,
    isParticlesRendering: false,
    activeParticlePreset: 'none' as LiveParticlePreset,

    // Adaptive Video Theming Engine
    sampleCanvas: null as HTMLCanvasElement | null,
    sampleCtx: null as CanvasRenderingContext2D | null,
    adaptiveTimer: 0,
    adaptiveThemingEnabled: true,
    currentExtractedAccent: '#0a84ff',
    currentExtractedPalette: ['#0a84ff', '#38bdf8', '#0f172a'],

    // State & Config
    currentTheme: null as LiveThemeDefinition | null,
    isTabHidden: false,
    isLowPowerMode: false,
    liveEnabled: true,

    init(): void {
        this.videoEl = document.getElementById('backdrop-video') as HTMLVideoElement | null;
        this.canvasEl = document.getElementById('backdrop-canvas') as HTMLCanvasElement | null;
        this.particlesEl = document.getElementById('backdrop-particles') as HTMLCanvasElement | null;
        this.imageEl = document.getElementById('backdrop-image');

        // Setup 2D Particle Canvas Context
        if (this.particlesEl) {
            this.particlesCtx = this.particlesEl.getContext('2d');
            this.resizeCanvases();
        }

        // Setup Offscreen Color Extraction Canvas
        this.sampleCanvas = document.createElement('canvas');
        this.sampleCanvas.width = 32;
        this.sampleCanvas.height = 32;
        this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Window resize listener
        window.addEventListener('resize', () => {
            this.resizeCanvases();
        });

        // Tab Visibility listener (Page Visibility API)
        document.addEventListener('visibilitychange', () => {
            this.isTabHidden = document.hidden;
            if (this.isTabHidden) {
                this.pauseAll();
            } else {
                this.resumeAll();
            }
        });

        // Battery Saver Check
        this.checkBatteryStatus();

        // Restore saved preferences
        try {
            const savedLive = localStorage.getItem('focusr_live_wallpaper_enabled');
            if (savedLive !== null) {
                this.liveEnabled = savedLive === 'true';
            }
            const savedAdaptive = localStorage.getItem('focusr_adaptive_theme_enabled');
            if (savedAdaptive !== null) {
                this.adaptiveThemingEnabled = savedAdaptive !== 'false';
            }
        } catch {}

        console.log('✨ LiveWallpaperManager initialized with Adaptive Video Theming & Extended Shaders');
    },

    resizeCanvases(): void {
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.particlesEl && this.particlesCtx) {
            this.particlesEl.width = w;
            this.particlesEl.height = h;
        }

        if (this.threeRenderer && this.threeCamera && this.canvasEl) {
            this.canvasEl.width = w;
            this.canvasEl.height = h;
            this.threeCamera.aspect = w / h;
            this.threeCamera.updateProjectionMatrix();
            this.threeRenderer.setSize(w, h, false);
        }
    },

    async checkBatteryStatus(): Promise<void> {
        try {
            if ('getBattery' in navigator) {
                const battery: any = await (navigator as any).getBattery();
                const update = () => {
                    this.isLowPowerMode = !battery.charging && battery.level <= 0.2;
                    if (this.isLowPowerMode) {
                        console.warn('⚡ Low battery detected: pausing live wallpapers to conserve energy');
                        this.pauseAll();
                    }
                };
                battery.addEventListener('levelchange', update);
                battery.addEventListener('chargingchange', update);
                update();
            }
        } catch {}
    },

    applyLiveWallpaper(theme: LiveThemeDefinition): void {
        this.currentTheme = theme;

        if (!this.liveEnabled || this.isLowPowerMode) {
            this.hideAllLiveLayers();
            return;
        }

        const liveType = theme.liveType || 'none';

        // 1. Handle Video Modality
        if (liveType === 'video' && theme.videoUrl) {
            this.stopShader();
            this.playVideo(theme.videoUrl);
        } else {
            this.stopVideo();
        }

        // 2. Handle Procedural Shader / Three.js Modality
        if (liveType === 'shader' && theme.shaderPreset) {
            this.stopVideo();
            this.startShader(theme.shaderPreset, theme.accent);
        } else {
            this.stopShader();
        }

        // 3. Handle Particle Overlay (can run atop image, shader, or video)
        const particlePreset = theme.particlePreset || (liveType === 'particles' ? 'stardust' : 'none');
        if (particlePreset && particlePreset !== 'none') {
            this.startParticles(particlePreset, theme.accent);
        } else {
            this.stopParticles();
        }
    },

    // ──────────────────────────────────────────
    // Video Engine & Adaptive Theming
    // ──────────────────────────────────────────
    playVideo(url: string): void {
        if (!this.videoEl) return;

        const v = this.videoEl;
        v.style.display = 'block';

        if (v.getAttribute('data-active-src') !== url) {
            v.setAttribute('data-active-src', url);
            v.src = url;
            v.load();
        }

        v.muted = true;
        v.loop = true;
        (v as any).playsInline = true;

        const playPromise = v.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    v.style.opacity = 'var(--backdrop-opacity, 0.85)';
                    this.startAdaptiveTheming();
                })
                .catch(err => {
                    console.warn('Live wallpaper autoplay prevented or failed:', err);
                    v.style.opacity = '0';
                    v.style.display = 'none';
                    this.stopAdaptiveTheming();
                });
        }
    },

    stopVideo(): void {
        this.stopAdaptiveTheming();
        if (!this.videoEl) return;
        this.videoEl.style.opacity = '0';
        setTimeout(() => {
            if (this.videoEl && this.videoEl.style.opacity === '0') {
                this.videoEl.pause();
                this.videoEl.style.display = 'none';
            }
        }, 500);
    },

    startAdaptiveTheming(): void {
        if (this.adaptiveTimer) clearInterval(this.adaptiveTimer);
        if (!this.adaptiveThemingEnabled) return;

        // Perform initial extraction after a brief moment for video decoder readiness
        setTimeout(() => this.sampleVideoFrame(), 250);

        // Continuous silky sampling every 1400ms (near-zero GPU/CPU overhead)
        this.adaptiveTimer = window.setInterval(() => {
            this.sampleVideoFrame();
        }, 1400);
    },

    stopAdaptiveTheming(): void {
        if (this.adaptiveTimer) {
            clearInterval(this.adaptiveTimer);
            this.adaptiveTimer = 0;
        }
    },

    setAdaptiveThemingEnabled(enabled: boolean): void {
        this.adaptiveThemingEnabled = enabled;
        try {
            localStorage.setItem('focusr_adaptive_theme_enabled', String(enabled));
        } catch {}

        if (enabled && this.currentTheme?.liveType === 'video') {
            this.startAdaptiveTheming();
        } else {
            this.stopAdaptiveTheming();
        }
    },

    sampleVideoFrame(): void {
        if (!this.videoEl || !this.sampleCtx || !this.sampleCanvas) return;
        if (this.videoEl.paused || this.videoEl.ended || this.videoEl.readyState < 2 || this.isTabHidden) return;
        if (!this.adaptiveThemingEnabled) return;

        try {
            const ctx = this.sampleCtx;
            ctx.drawImage(this.videoEl, 0, 0, 32, 32);
            const data = ctx.getImageData(0, 0, 32, 32).data;

            // Analyze color distribution & vibrancy across pixels
            let bestScore = -1;
            let dominantR = 10, dominantG = 132, dominantB = 255;
            let avgR = 0, avgG = 0, avgB = 0;
            let sampleCount = 0;

            const hueBuckets = new Array(12).fill(0).map(() => ({ count: 0, r: 0, g: 0, b: 0, maxSat: 0 }));

            for (let i = 0; i < data.length; i += 16) { // 64 samples
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                avgR += r;
                avgG += g;
                avgB += b;
                sampleCount++;

                // RGB to HSL
                const rn = r / 255, gn = g / 255, bn = b / 255;
                const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
                const l = (max + min) / 2;

                if (max === min || l < 0.12 || l > 0.92) continue; // Skip near-black or blown-out white

                const d = max - min;
                const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                let h = 0;
                if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
                else if (max === gn) h = (bn - rn) / d + 2;
                else h = (rn - gn) / d + 4;
                h = (h * 60) % 360;

                const bucketIndex = Math.floor(h / 30) % 12;
                const score = s * 1.5 + (1 - Math.abs(2 * l - 1));

                const bucket = hueBuckets[bucketIndex];
                bucket.count += score;
                bucket.r += r;
                bucket.g += g;
                bucket.b += b;
                if (s > bucket.maxSat) bucket.maxSat = s;
            }

            // Find best vibrant cluster
            for (let k = 0; k < 12; k++) {
                const b = hueBuckets[k];
                if (b.count > bestScore) {
                    bestScore = b.count;
                    dominantR = Math.round(b.r / Math.max(1, b.count / 1.5));
                    dominantG = Math.round(b.g / Math.max(1, b.count / 1.5));
                    dominantB = Math.round(b.b / Math.max(1, b.count / 1.5));
                }
            }

            if (sampleCount > 0) {
                avgR = Math.round(avgR / sampleCount);
                avgG = Math.round(avgG / sampleCount);
                avgB = Math.round(avgB / sampleCount);
            }

            // Ensure vibrant minimum contrast
            dominantR = Math.min(255, Math.max(25, dominantR));
            dominantG = Math.min(255, Math.max(25, dominantG));
            dominantB = Math.min(255, Math.max(25, dominantB));

            const toHex = (c: number) => c.toString(16).padStart(2, '0');
            const dominantHex = `#${toHex(dominantR)}${toHex(dominantG)}${toHex(dominantB)}`;
            const secondaryHex = `#${toHex(Math.round(dominantG * 0.8 + avgR * 0.2))}${toHex(Math.round(dominantB * 0.8 + avgG * 0.2))}${toHex(Math.round(dominantR * 0.8 + avgB * 0.2))}`;
            const darkTintHex = `rgba(${Math.round(avgR * 0.12)}, ${Math.round(avgG * 0.12)}, ${Math.round(avgB * 0.14)}, 0.68)`;

            // Compute HSL hue
            const max = Math.max(dominantR, dominantG, dominantB);
            const min = Math.min(dominantR, dominantG, dominantB);
            let liquidHue = 195;
            if (max !== min) {
                const d = max - min;
                if (max === dominantR) liquidHue = Math.round(((dominantG - dominantB) / d + (dominantG < dominantB ? 6 : 0)) * 60);
                else if (max === dominantG) liquidHue = Math.round(((dominantB - dominantR) / d + 2) * 60);
                else liquidHue = Math.round(((dominantR - dominantG) / d + 4) * 60);
            }

            this.currentExtractedAccent = dominantHex;
            this.currentExtractedPalette = [dominantHex, secondaryHex, `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`];

            // Smoothly update root CSS custom variables with native transitions
            const root = document.documentElement;
            root.style.setProperty('--accent', dominantHex);
            root.style.setProperty('--accent-glow', `rgba(${dominantR}, ${dominantG}, ${dominantB}, 0.38)`);
            root.style.setProperty('--liquid-hue', String(liquidHue));
            root.style.setProperty('--backdrop-tint', darkTintHex);
            root.style.setProperty('--orb-1-color', `rgba(${dominantR}, ${dominantG}, ${dominantB}, 0.22)`);
            root.style.setProperty('--orb-2-color', `rgba(${avgR}, ${avgG}, ${avgB}, 0.14)`);

            // Synchronize with Cosmo Companion LED & Thrusters
            if ((window as any).Cosmo && typeof (window as any).Cosmo.updateThemeColor === 'function') {
                (window as any).Cosmo.updateThemeColor(dominantHex);
            }

            // Synchronize timer circle stroke if present
            const ringFill = document.getElementById('ring-fill');
            if (ringFill) {
                ringFill.style.stroke = dominantHex;
            }

            // Dispatch event for UI status badge
            window.dispatchEvent(new CustomEvent('focusr-adaptive-theme-update', {
                detail: {
                    accent: dominantHex,
                    palette: this.currentExtractedPalette,
                    liquidHue
                }
            }));
        } catch (e) {
            // Sampling error guard
        }
    },

    // ──────────────────────────────────────────
    // Procedural Three.js Shader/Mesh Engine
    // ──────────────────────────────────────────
    startShader(preset: LiveShaderPreset, accentHex: string): void {
        if (!this.canvasEl) return;
        this.stopShader();

        this.activeShaderPreset = preset;
        this.shaderTime = 0;

        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvasEl.style.display = 'block';
        this.canvasEl.width = w;
        this.canvasEl.height = h;

        if (!this.threeRenderer) {
            this.threeRenderer = new THREE.WebGLRenderer({
                canvas: this.canvasEl,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        this.threeRenderer.setSize(w, h, false);
        this.threeScene = new THREE.Scene();
        this.threeCamera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
        this.threeCamera.position.z = 5;

        const accentColor = new THREE.Color(accentHex || '#38bdf8');

        // Scene Dispatcher
        if (preset === 'cosmic-void') {
            this.buildCosmicVoid(accentColor);
        } else if (preset === 'aurora-waves') {
            this.buildAuroraWaves(accentColor);
        } else if (preset === 'cyber-rain') {
            this.buildCyberRain(accentColor);
        } else if (preset === 'black-hole') {
            this.buildBlackHole(accentColor);
        } else if (preset === 'bioluminescent') {
            this.buildBioluminescent(accentColor);
        } else if (preset === 'matrix-code') {
            this.buildMatrixCode(accentColor);
        } else {
            this.buildZenRipples(accentColor);
        }

        this.isThreeRendering = true;
        this.canvasEl.style.opacity = 'var(--backdrop-opacity, 0.85)';
        this.renderThreeLoop();
    },

    // 1. Cosmic Void: Multi-layer Parallax Starfield & Shooting Meteors
    buildCosmicVoid(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const group = new THREE.Group();

        // Layer A: Distant Deep Stars (dense, faint)
        const countA = 1600;
        const geoA = new THREE.BufferGeometry();
        const posA = new Float32Array(countA * 3);
        const colA = new Float32Array(countA * 3);
        const white = new THREE.Color(0xffffff);

        for (let i = 0; i < countA; i++) {
            const i3 = i * 3;
            posA[i3] = (Math.random() - 0.5) * 50;
            posA[i3 + 1] = (Math.random() - 0.5) * 50;
            posA[i3 + 2] = -10 - Math.random() * 40;

            const c = Math.random() < 0.2 ? accentColor : white;
            colA[i3] = c.r;
            colA[i3 + 1] = c.g;
            colA[i3 + 2] = c.b;
        }
        geoA.setAttribute('position', new THREE.BufferAttribute(posA, 3));
        geoA.setAttribute('color', new THREE.BufferAttribute(colA, 3));
        const matA = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.65 });
        group.add(new THREE.Points(geoA, matA));

        // Layer B: Mid-depth Twinkling Stardust
        const countB = 600;
        const geoB = new THREE.BufferGeometry();
        const posB = new Float32Array(countB * 3);
        for (let i = 0; i < countB; i++) {
            posB[i * 3] = (Math.random() - 0.5) * 35;
            posB[i * 3 + 1] = (Math.random() - 0.5) * 35;
            posB[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        geoB.setAttribute('position', new THREE.BufferAttribute(posB, 3));
        const matB = new THREE.PointsMaterial({ size: 0.22, color: accentColor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        group.add(new THREE.Points(geoB, matB));

        // Meteors / Shooting Stars
        this.meteors = [];
        const meteorCount = 4;
        const meteorGeo = new THREE.BufferGeometry();
        const meteorPositions = new Float32Array(meteorCount * 6);
        meteorGeo.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3));
        const meteorMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
        this.meteorMesh = new THREE.LineSegments(meteorGeo, meteorMat);
        group.add(this.meteorMesh);

        for (let m = 0; m < meteorCount; m++) {
            this.meteors.push({
                active: false,
                x: 0, y: 0, z: 0,
                vx: -0.28 - Math.random() * 0.2,
                vy: -0.18 - Math.random() * 0.15,
                length: 2.5 + Math.random() * 2,
                alpha: 0
            });
        }

        this.threeMesh = group;
        this.threeScene.add(this.threeMesh);
    },

    // 2. Aurora Waves: Dynamic Spectral Curtains with Sine Fluid Flow
    buildAuroraWaves(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const group = new THREE.Group();
        this.auroraPlanes = [];

        // Dual Spectral Curtains
        const colors = [accentColor, new THREE.Color(0xa855f7), new THREE.Color(0x00e5ff)];

        for (let i = 0; i < 3; i++) {
            const planeGeo = new THREE.PlaneGeometry(24, 12, 60, 36);
            const mat = new THREE.MeshBasicMaterial({
                color: colors[i],
                wireframe: true,
                transparent: true,
                opacity: 0.18 - i * 0.03,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(planeGeo, mat);
            mesh.rotation.x = -Math.PI / 3.2;
            mesh.position.set(0, -0.8 - i * 0.4, -i * 1.5);
            group.add(mesh);
            this.auroraPlanes.push(mesh);
        }

        this.threeMesh = group;
        this.threeScene.add(this.threeMesh);
    },

    // 3. Cyber Rain: Neon Streaks with Floor Splash Rings
    buildCyberRain(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const dropCount = 1200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(dropCount * 3);
        const colors = new Float32Array(dropCount * 3);

        const cyan = accentColor;
        const magenta = new THREE.Color(0xf43f5e);

        for (let i = 0; i < dropCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 26;
            positions[i3 + 1] = (Math.random() - 0.5) * 22;
            positions[i3 + 2] = (Math.random() - 0.5) * 14;

            const c = Math.random() < 0.75 ? cyan : magenta;
            colors[i3] = c.r;
            colors[i3 + 1] = c.g;
            colors[i3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.18,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });

        this.threeMesh = new THREE.Points(geometry, material);
        this.threeScene.add(this.threeMesh);
    },

    // 4. Black Hole & Relativistic Accretion Vortex
    buildBlackHole(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const group = new THREE.Group();

        // A. Event Horizon (Obsidian Sphere)
        const horizonGeo = new THREE.SphereGeometry(1.25, 32, 32);
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0x010204 });
        const horizon = new THREE.Mesh(horizonGeo, horizonMat);
        group.add(horizon);

        // B. Einstein Photon Lensing Ring
        const ringGeo = new THREE.RingGeometry(1.26, 1.34, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);

        // C. Accretion Disk Particles (Swirling relativistic vortex)
        const pCount = 2200;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        const pCol = new Float32Array(pCount * 3);
        const radii = new Float32Array(pCount);
        const angles = new Float32Array(pCount);
        const speeds = new Float32Array(pCount);

        const gold = new THREE.Color(0xfbbf24);
        const amber = accentColor;
        const hotWhite = new THREE.Color(0xffffff);

        for (let i = 0; i < pCount; i++) {
            const r = 1.38 + Math.pow(Math.random(), 1.8) * 3.6;
            const theta = Math.random() * Math.PI * 2;
            const speed = (1.5 / Math.sqrt(r)) * (0.015 + Math.random() * 0.008);

            radii[i] = r;
            angles[i] = theta;
            speeds[i] = speed;

            pPos[i * 3] = Math.cos(theta) * r;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 0.18;
            pPos[i * 3 + 2] = Math.sin(theta) * r;

            const c = r < 1.7 ? hotWhite : (Math.random() < 0.6 ? gold : amber);
            pCol[i * 3] = c.r;
            pCol[i * 3 + 1] = c.g;
            pCol[i * 3 + 2] = c.b;
        }

        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

        const pMat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.82,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(pGeo, pMat);
        points.rotation.x = Math.PI / 4.5;
        group.add(points);

        this.blackHoleParticles = { points, radii, angles, speeds };
        this.threeMesh = group;
        this.threeScene.add(this.threeMesh);
    },

    // 5. Bioluminescent Abyss: Floating Ocean Jelly Spores
    buildBioluminescent(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const count = 900;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const cyan = accentColor;
        const emerald = new THREE.Color(0x10b981);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 25;
            positions[i3 + 1] = (Math.random() - 0.5) * 20;
            positions[i3 + 2] = (Math.random() - 0.5) * 15;

            const c = Math.random() < 0.55 ? cyan : emerald;
            colors[i3] = c.r;
            colors[i3 + 1] = c.g;
            colors[i3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.24,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.threeMesh = new THREE.Points(geometry, material);
        this.threeScene.add(this.threeMesh);
    },

    // 6. Matrix Code Stream
    buildMatrixCode(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const colCount = 60;
        const nodesPerCol = 18;
        const total = colCount * nodesPerCol;

        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);

        this.matrixColumns = [];
        const green = new THREE.Color(0x22c55e);
        const headWhite = new THREE.Color(0xeefdf5);

        for (let c = 0; c < colCount; c++) {
            const colX = (c / colCount - 0.5) * 22;
            const startY = (Math.random() - 0.5) * 18;
            const speed = 0.06 + Math.random() * 0.08;
            this.matrixColumns.push({ x: colX, y: startY, speed, len: nodesPerCol });

            for (let n = 0; n < nodesPerCol; n++) {
                const idx = (c * nodesPerCol + n) * 3;
                positions[idx] = colX;
                positions[idx + 1] = startY - n * 0.35;
                positions[idx + 2] = (Math.random() - 0.5) * 4;

                const col = n === 0 ? headWhite : green;
                colors[idx] = col.r;
                colors[idx + 1] = col.g;
                colors[idx + 2] = col.b;
            }
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.18,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending
        });

        this.threeMesh = new THREE.Points(geo, mat);
        this.threeScene.add(this.threeMesh);
    },

    // 7. Zen Ripples: Concentric Water Droplet Rings
    buildZenRipples(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const group = new THREE.Group();
        const ringCount = 10;

        for (let i = 0; i < ringCount; i++) {
            const radius = (i + 1) * 0.65;
            const geo = new THREE.RingGeometry(radius, radius + 0.035, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.35 - (i * 0.03),
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = -Math.PI / 3;
            group.add(ring);
        }

        this.threeMesh = group;
        this.threeScene.add(this.threeMesh);
    },

    renderThreeLoop(): void {
        if (!this.isThreeRendering || this.isTabHidden) return;

        this.threeAnimationId = requestAnimationFrame(() => this.renderThreeLoop());
        this.shaderTime += 0.018;

        const t = this.shaderTime;
        const preset = this.activeShaderPreset;

        // Dynamic per-preset continuous animation math
        if (preset === 'aurora-waves' && this.auroraPlanes.length > 0) {
            this.auroraPlanes.forEach((mesh, idx) => {
                const pos = mesh.geometry.attributes.position;
                const arr = pos.array as Float32Array;
                for (let i = 0; i < arr.length; i += 3) {
                    const u = arr[i];
                    const v = arr[i + 1];
                    arr[i + 2] = Math.sin(u * 0.45 + t * 1.5 + idx) * 0.65 + Math.cos(v * 0.35 + t * 1.2) * 0.45;
                }
                pos.needsUpdate = true;
                mesh.rotation.z = Math.sin(t * 0.3 + idx) * 0.05;
            });
        } else if (preset === 'black-hole' && this.blackHoleParticles) {
            const { points, radii, angles, speeds } = this.blackHoleParticles;
            const posAttr = points.geometry.attributes.position;
            const posArr = posAttr.array as Float32Array;

            for (let i = 0; i < radii.length; i++) {
                angles[i] += speeds[i];
                const r = radii[i];
                const th = angles[i];
                posArr[i * 3] = Math.cos(th) * r;
                posArr[i * 3 + 2] = Math.sin(th) * r;
            }
            posAttr.needsUpdate = true;
        } else if (preset === 'matrix-code' && this.threeMesh && this.matrixColumns.length > 0) {
            const posAttr = (this.threeMesh as THREE.Points).geometry.attributes.position;
            const posArr = posAttr.array as Float32Array;
            const count = this.matrixColumns.length;
            const nodes = 18;

            for (let c = 0; c < count; c++) {
                const col = this.matrixColumns[c];
                col.y -= col.speed;
                if (col.y < -12) col.y = 12;

                for (let n = 0; n < nodes; n++) {
                    const idx = (c * nodes + n) * 3;
                    posArr[idx + 1] = col.y - n * 0.35;
                }
            }
            posAttr.needsUpdate = true;
        } else if (preset === 'cosmic-void') {
            if (this.threeMesh) {
                this.threeMesh.rotation.y += 0.0008;
                this.threeMesh.rotation.z += 0.0003;
            }

            // Animate Shooting Meteors
            if (this.meteorMesh && this.meteors.length > 0) {
                const posAttr = this.meteorMesh.geometry.attributes.position;
                const arr = posAttr.array as Float32Array;

                for (let m = 0; m < this.meteors.length; m++) {
                    const met = this.meteors[m];
                    if (!met.active) {
                        if (Math.random() < 0.006) {
                            met.active = true;
                            met.x = 8 + Math.random() * 8;
                            met.y = 6 + Math.random() * 6;
                            met.z = (Math.random() - 0.5) * 8;
                        }
                    } else {
                        met.x += met.vx;
                        met.y += met.vy;
                        if (met.x < -15 || met.y < -12) {
                            met.active = false;
                        }
                    }

                    const idx = m * 6;
                    if (met.active) {
                        arr[idx] = met.x;
                        arr[idx + 1] = met.y;
                        arr[idx + 2] = met.z;
                        arr[idx + 3] = met.x - met.vx * met.length;
                        arr[idx + 4] = met.y - met.vy * met.length;
                        arr[idx + 5] = met.z;
                    } else {
                        arr[idx] = 999; arr[idx + 1] = 999; arr[idx + 2] = 999;
                        arr[idx + 3] = 999; arr[idx + 4] = 999; arr[idx + 5] = 999;
                    }
                }
                posAttr.needsUpdate = true;
            }
        } else if (preset === 'cyber-rain' && this.threeMesh) {
            const posAttr = (this.threeMesh as THREE.Points).geometry.attributes.position;
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i] -= 0.04; // subtle angled wind drift
                arr[i + 1] -= 0.32;
                if (arr[i + 1] < -10) {
                    arr[i + 1] = 11;
                    arr[i] = (Math.random() - 0.5) * 26;
                }
            }
            posAttr.needsUpdate = true;
        } else if (preset === 'bioluminescent' && this.threeMesh) {
            const posAttr = (this.threeMesh as THREE.Points).geometry.attributes.position;
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i + 1] += 0.015;
                arr[i] += Math.sin(t + i) * 0.008;
                if (arr[i + 1] > 10) arr[i + 1] = -10;
            }
            posAttr.needsUpdate = true;
        } else if (preset === 'zen-ripples' && this.threeMesh) {
            this.threeMesh.children.forEach((ring, idx) => {
                const s = 1 + Math.sin(t * 1.8 + idx * 0.5) * 0.08;
                ring.scale.set(s, s, s);
            });
        }

        if (this.threeRenderer && this.threeScene && this.threeCamera) {
            this.threeRenderer.render(this.threeScene, this.threeCamera);
        }
    },

    stopShader(): void {
        this.isThreeRendering = false;
        if (this.threeAnimationId) {
            cancelAnimationFrame(this.threeAnimationId);
            this.threeAnimationId = 0;
        }
        if (this.canvasEl) {
            this.canvasEl.style.opacity = '0';
            setTimeout(() => {
                if (this.canvasEl && !this.isThreeRendering) {
                    this.canvasEl.style.display = 'none';
                }
            }, 400);
        }
        if (this.threeScene && this.threeMesh) {
            this.threeScene.remove(this.threeMesh);
            this.threeMesh = null;
        }
        this.auroraPlanes = [];
        this.blackHoleParticles = null;
        this.meteors = [];
        this.matrixColumns = [];
    },

    // ──────────────────────────────────────────
    // Atmospheric Particle Overlay Engine (2D Canvas)
    // ──────────────────────────────────────────
    startParticles(preset: LiveParticlePreset, accentHex: string): void {
        if (!this.particlesEl || !this.particlesCtx) return;
        this.stopParticles();

        this.activeParticlePreset = preset;
        this.particlesEl.style.display = 'block';
        this.particlesEl.style.opacity = '1';

        const w = window.innerWidth;
        const h = window.innerHeight;
        this.particlesEl.width = w;
        this.particlesEl.height = h;

        const count = preset === 'rain' ? 140 : preset === 'sakura' ? 65 : preset === 'snow' ? 80 : 55;
        this.particlesList = [];

        for (let i = 0; i < count; i++) {
            this.particlesList.push(this.createParticle(preset, accentHex, w, h));
        }

        this.isParticlesRendering = true;
        this.renderParticlesLoop();
    },

    createParticle(preset: LiveParticlePreset, accentHex: string, w: number, h: number): Particle {
        const x = Math.random() * w;
        const y = Math.random() * h;

        if (preset === 'rain') {
            return {
                x,
                y,
                vx: -0.8 - Math.random() * 0.4,
                vy: 7.5 + Math.random() * 5.0,
                size: 1 + Math.random() * 1.5,
                alpha: 0.35 + Math.random() * 0.45,
                alphaSpeed: 0,
                color: accentHex || '#38bdf8'
            };
        } else if (preset === 'sakura') {
            const pinks = ['#f472b6', '#fbcfe8', '#fda4af', '#fb7185'];
            return {
                x,
                y,
                vx: 0.5 + Math.random() * 0.8,
                vy: 0.9 + Math.random() * 1.2,
                size: 4 + Math.random() * 5,
                alpha: 0.55 + Math.random() * 0.35,
                alphaSpeed: 0,
                color: pinks[Math.floor(Math.random() * pinks.length)],
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.02,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.04,
                aspect: 0.55 + Math.random() * 0.35
            };
        } else if (preset === 'snow') {
            return {
                x,
                y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: 0.8 + Math.random() * 1.2,
                size: 1.5 + Math.random() * 2.5,
                alpha: 0.4 + Math.random() * 0.4,
                alphaSpeed: 0,
                color: '#ffffff',
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.02
            };
        } else if (preset === 'embers') {
            const emberCols = ['#f59e0b', '#f97316', '#ef4444', '#fbbf24'];
            return {
                x,
                y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -1.4 - Math.random() * 1.8,
                size: 1.8 + Math.random() * 2.4,
                alpha: 0.35 + Math.random() * 0.55,
                alphaSpeed: 0.007 + Math.random() * 0.008,
                color: emberCols[Math.floor(Math.random() * emberCols.length)]
            };
        } else {
            // stardust
            return {
                x,
                y,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: 1 + Math.random() * 2,
                alpha: 0.2 + Math.random() * 0.5,
                alphaSpeed: 0.005 + Math.random() * 0.005,
                color: accentHex || '#a855f7'
            };
        }
    },

    renderParticlesLoop(): void {
        if (!this.isParticlesRendering || this.isTabHidden || !this.particlesCtx || !this.particlesEl) return;

        this.particlesAnimationId = requestAnimationFrame(() => this.renderParticlesLoop());

        const ctx = this.particlesCtx;
        const w = this.particlesEl.width;
        const h = this.particlesEl.height;

        ctx.clearRect(0, 0, w, h);

        const preset = this.activeParticlePreset;

        for (let i = 0; i < this.particlesList.length; i++) {
            const p = this.particlesList[i];

            if (preset === 'rain') {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
                if (p.x < 0) { p.x = w; }

                ctx.strokeStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * 2.4, p.y + p.vy * 2.4);
                ctx.stroke();
            } else if (preset === 'sakura') {
                p.sway = (p.sway || 0) + (p.swaySpeed || 0.02);
                p.rotation = (p.rotation || 0) + (p.rotSpeed || 0.02);
                p.x += p.vx + Math.sin(p.sway) * 0.9;
                p.y += p.vy;

                if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
                if (p.x > w + 10) { p.x = -10; }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * (p.aspect || 0.6), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (preset === 'snow') {
                p.sway = (p.sway || 0) + (p.swaySpeed || 0.02);
                p.x += p.vx + Math.sin(p.sway) * 0.5;
                p.y += p.vy;
                if (p.y > h) { p.y = -10; p.x = Math.random() * w; }

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (preset === 'embers') {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.alphaSpeed;
                if (p.alpha <= 0 || p.y < 0) {
                    p.y = h + 10;
                    p.x = Math.random() * w;
                    p.alpha = 0.35 + Math.random() * 0.6;
                }

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // stardust
                p.x += p.vx;
                p.y += p.vy;
                p.alpha += p.alphaSpeed;
                if (p.alpha >= 0.8 || p.alpha <= 0.1) {
                    p.alphaSpeed = -p.alphaSpeed;
                }
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0.05, Math.min(0.9, p.alpha));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    },

    stopParticles(): void {
        this.isParticlesRendering = false;
        if (this.particlesAnimationId) {
            cancelAnimationFrame(this.particlesAnimationId);
            this.particlesAnimationId = 0;
        }
        if (this.particlesEl) {
            this.particlesEl.style.opacity = '0';
            setTimeout(() => {
                if (this.particlesEl && !this.isParticlesRendering) {
                    this.particlesEl.style.display = 'none';
                    if (this.particlesCtx) {
                        this.particlesCtx.clearRect(0, 0, this.particlesEl.width, this.particlesEl.height);
                    }
                }
            }, 300);
        }
    },

    // ──────────────────────────────────────────
    // Lifecycle & Guardrails
    // ──────────────────────────────────────────
    pauseAll(): void {
        if (this.videoEl) this.videoEl.pause();
        this.stopAdaptiveTheming();
        this.isThreeRendering = false;
        this.isParticlesRendering = false;
        if (this.threeAnimationId) cancelAnimationFrame(this.threeAnimationId);
        if (this.particlesAnimationId) cancelAnimationFrame(this.particlesAnimationId);
    },

    resumeAll(): void {
        if (!this.liveEnabled || this.isLowPowerMode || !this.currentTheme) return;

        if (this.currentTheme.liveType === 'video' && this.videoEl) {
            this.videoEl.play().catch(() => {});
            this.startAdaptiveTheming();
        }
        if (this.currentTheme.liveType === 'shader') {
            this.isThreeRendering = true;
            this.renderThreeLoop();
        }
        if (this.activeParticlePreset !== 'none') {
            this.isParticlesRendering = true;
            this.renderParticlesLoop();
        }
    },

    hideAllLiveLayers(): void {
        this.stopVideo();
        this.stopShader();
        this.stopParticles();
    },

    setLiveEnabled(enabled: boolean): void {
        this.liveEnabled = enabled;
        try {
            localStorage.setItem('focusr_live_wallpaper_enabled', String(enabled));
        } catch {}

        if (enabled && this.currentTheme) {
            this.applyLiveWallpaper(this.currentTheme);
        } else {
            this.hideAllLiveLayers();
        }
    }
};
