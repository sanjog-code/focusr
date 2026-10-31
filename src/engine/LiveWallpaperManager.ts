import * as THREE from 'three';
import { LiveThemeDefinition, LiveWallpaperType, LiveShaderPreset, LiveParticlePreset } from '../types/index';

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
}

export const LiveWallpaperManager = {
    // DOM Elements
    videoEl: null as HTMLVideoElement | null,
    canvasEl: null as HTMLCanvasElement | null,
    particlesEl: null as HTMLCanvasElement | null,
    imageEl: HTMLElement | null,

    // Three.js State for Shader/Canvas Engine
    threeScene: null as THREE.Scene | null,
    threeCamera: null as THREE.PerspectiveCamera | null,
    threeRenderer: null as THREE.WebGLRenderer | null,
    threeMesh: null as THREE.Object3D | null,
    threeAnimationId: 0,
    isThreeRendering: false,

    // 2D Particle Engine State
    particlesCtx: null as CanvasRenderingContext2D | null,
    particlesList: [] as Particle[],
    particlesAnimationId: 0,
    isParticlesRendering: false,
    activeParticlePreset: 'none' as LiveParticlePreset,

    // State & Config
    currentTheme: null as LiveThemeDefinition | null,
    isTabHidden: false,
    isLowPowerMode: false,
    liveEnabled: true,
    fpsLimit: 60,
    lastFrameTime: 0,

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

        // Restore saved preference
        try {
            const savedLive = localStorage.getItem('focusr_live_wallpaper_enabled');
            if (savedLive !== null) {
                this.liveEnabled = savedLive === 'true';
            }
        } catch {}

        console.log('✨ LiveWallpaperManager initialized');
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
        } catch (e) {
            // Battery API optional
        }
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

        // 3. Handle Particle Overlay (can run atop image or video)
        const particlePreset = theme.particlePreset || (liveType === 'particles' ? 'stardust' : 'none');
        if (particlePreset && particlePreset !== 'none') {
            this.startParticles(particlePreset, theme.accent);
        } else {
            this.stopParticles();
        }
    },

    // ──────────────────────────────────────────
    // Video Engine
    // ──────────────────────────────────────────
    playVideo(url: string): void {
        if (!this.videoEl) return;

        const v = this.videoEl;
        v.style.display = 'block';

        // Only update source if changed to prevent reload stutter
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
                })
                .catch(err => {
                    console.warn('Live wallpaper autoplay prevented or failed:', err);
                    v.style.opacity = '0';
                    v.style.display = 'none';
                });
        }
    },

    stopVideo(): void {
        if (!this.videoEl) return;
        this.videoEl.style.opacity = '0';
        setTimeout(() => {
            if (this.videoEl && this.videoEl.style.opacity === '0') {
                this.videoEl.pause();
                this.videoEl.style.display = 'none';
            }
        }, 500);
    },

    // ──────────────────────────────────────────
    // Procedural Three.js Shader/Mesh Engine
    // ──────────────────────────────────────────
    startShader(preset: LiveShaderPreset, accentHex: string): void {
        if (!this.canvasEl) return;
        this.stopShader();

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

        // Build Scene according to preset
        const accentColor = new THREE.Color(accentHex || '#38bdf8');

        if (preset === 'cosmic-void') {
            this.buildCosmicVoid(accentColor);
        } else if (preset === 'aurora-waves') {
            this.buildAuroraWaves(accentColor);
        } else if (preset === 'cyber-rain') {
            this.buildCyberRain(accentColor);
        } else {
            this.buildZenRipples(accentColor);
        }

        this.isThreeRendering = true;
        this.canvasEl.style.opacity = 'var(--backdrop-opacity, 0.85)';
        this.renderThreeLoop();
    },

    buildCosmicVoid(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const starCount = 1800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const baseColor = new THREE.Color('#ffffff');

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 40;
            positions[i3 + 1] = (Math.random() - 0.5) * 40;
            positions[i3 + 2] = (Math.random() - 0.5) * 40;

            const isAccent = Math.random() < 0.25;
            const c = isAccent ? accentColor : baseColor;
            colors[i3] = c.r;
            colors[i3 + 1] = c.g;
            colors[i3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.16,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });

        this.threeMesh = new THREE.Points(geometry, material);
        this.threeScene.add(this.threeMesh);
    },

    buildAuroraWaves(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const planeGeo = new THREE.PlaneGeometry(16, 10, 48, 32);
        const material = new THREE.MeshBasicMaterial({
            color: accentColor,
            wireframe: true,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Mesh(planeGeo, material);
        mesh.rotation.x = -Math.PI / 4;
        mesh.position.y = -1;
        this.threeMesh = mesh;
        this.threeScene.add(this.threeMesh);
    },

    buildCyberRain(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const dropCount = 900;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(dropCount * 3);

        for (let i = 0; i < dropCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 20;
            positions[i3 + 1] = (Math.random() - 0.5) * 20;
            positions[i3 + 2] = (Math.random() - 0.5) * 10;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.18,
            color: accentColor,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.threeMesh = new THREE.Points(geometry, material);
        this.threeScene.add(this.threeMesh);
    },

    buildZenRipples(accentColor: THREE.Color): void {
        if (!this.threeScene) return;

        const group = new THREE.Group();
        const ringCount = 8;

        for (let i = 0; i < ringCount; i++) {
            const radius = (i + 1) * 0.75;
            const geo = new THREE.RingGeometry(radius, radius + 0.03, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.3 - (i * 0.03),
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

        if (this.threeMesh) {
            this.threeMesh.rotation.y += 0.001;
            this.threeMesh.rotation.z += 0.0005;
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

        const count = preset === 'rain' ? 140 : preset === 'snow' ? 80 : 50;
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
                vx: -0.6 - Math.random() * 0.4,
                vy: 6.5 + Math.random() * 4.5,
                size: 1 + Math.random() * 1.5,
                alpha: 0.35 + Math.random() * 0.4,
                alphaSpeed: 0,
                color: accentHex || '#38bdf8'
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
            return {
                x,
                y,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -1.2 - Math.random() * 1.6,
                size: 1.5 + Math.random() * 2,
                alpha: 0.3 + Math.random() * 0.5,
                alphaSpeed: 0.008 + Math.random() * 0.008,
                color: accentHex || '#f59e0b'
            };
        } else {
            // stardust / petals
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
                ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
                ctx.stroke();
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
                    p.alpha = 0.3 + Math.random() * 0.6;
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
        this.isThreeRendering = false;
        this.isParticlesRendering = false;
        if (this.threeAnimationId) cancelAnimationFrame(this.threeAnimationId);
        if (this.particlesAnimationId) cancelAnimationFrame(this.particlesAnimationId);
    },

    resumeAll(): void {
        if (!this.liveEnabled || this.isLowPowerMode || !this.currentTheme) return;

        if (this.currentTheme.liveType === 'video' && this.videoEl) {
            this.videoEl.play().catch(() => {});
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
