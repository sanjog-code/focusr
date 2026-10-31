import * as THREE from 'three';
import { AudioMaster } from '../audio/AudioMaster';

export const CosmoCompanion = {
    canvas: null as HTMLCanvasElement | null,
    stage: null as HTMLElement | null,
    actor: null as HTMLElement | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    rocketGroup: null as THREE.Group | null,
    
    // Visor Texture & Canvas
    faceCanvas: null as HTMLCanvasElement | null,
    faceCtx: null as CanvasRenderingContext2D | null,
    faceTexture: null as THREE.CanvasTexture | null,

    // Materials
    rocketMat: null as THREE.MeshStandardMaterial | null,
    chromeMat: null as THREE.MeshStandardMaterial | null,
    accentMat: null as THREE.MeshStandardMaterial | null,
    visorMat: null as THREE.MeshBasicMaterial | null,

    // Animation & State
    isRendering: false,
    isTabHidden: false,
    isZenActive: false,
    enabled: true,
    rafId: 0,
    time: 0,
    eyeState: 'happy',
    lastBlinkTime: 0,
    isBlinking: false,

    init(): void {
        this.stage = document.getElementById('cosmo-stage');
        this.actor = document.getElementById('cosmo-actor');
        this.canvas = document.getElementById('cosmo-canvas') as HTMLCanvasElement | null;

        if (!this.canvas) return;

        // 1. Offscreen Visor Canvas
        this.faceCanvas = document.createElement('canvas');
        this.faceCanvas.width = 256;
        this.faceCanvas.height = 256;
        this.faceCtx = this.faceCanvas.getContext('2d');
        this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
        this.faceTexture.generateMipmaps = false;
        this.faceTexture.minFilter = THREE.LinearFilter;
        this.faceTexture.magFilter = THREE.LinearFilter;
        this.drawFace('happy');

        // 2. Three.js Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
        this.camera.position.set(0, 0.1, 5.4);

        // 3. Renderer with hardware performance
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.renderer.setSize(200, 200, false);
        this.renderer.setPixelRatio(dpr);

        // 4. Lights
        const amb = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(amb);
        const dir = new THREE.DirectionalLight(0xffffff, 1.5);
        dir.position.set(5, 8, 5);
        this.scene.add(dir);
        const rim = new THREE.DirectionalLight(0x38bdf8, 1.2);
        rim.position.set(-4, 3, -3);
        this.scene.add(rim);

        // 5. Rocket Model Group
        this.buildModel();

        // 6. Intelligent Visibility & GPU Render Pause Hooks
        document.addEventListener('visibilitychange', () => {
            this.isTabHidden = document.hidden;
            if (this.isTabHidden) {
                this.pauseLoop();
            } else if (!this.isZenActive && this.enabled) {
                this.startLoop();
            }
        });

        window.addEventListener('focusr:zen-toggle', ((e: CustomEvent) => {
            this.isZenActive = !!e.detail?.active;
            if (this.isZenActive) {
                this.pauseLoop();
            } else if (!this.isTabHidden && this.enabled) {
                this.startLoop();
            }
        }) as EventListener);

        if (this.enabled) {
            this.startLoop();
        }
    },

    buildModel(): void {
        if (!this.scene) return;
        this.rocketGroup = new THREE.Group();

        // High-Fidelity Materials: Brilliant Ceramic White & Chrome
        this.rocketMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.18,
            metalness: 0.15
        });
        this.chromeMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.12,
            metalness: 0.92
        });
        this.accentMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            roughness: 0.2,
            metalness: 0.45
        });

        // 1. Fuselage
        const bodyGeo = new THREE.CylinderGeometry(0.36, 0.46, 1.4, 32);
        const body = new THREE.Mesh(bodyGeo, this.rocketMat);
        body.position.y = -0.3;
        this.rocketGroup.add(body);

        // 2. Nose Cone & Collar
        const noseGeo = new THREE.ConeGeometry(0.36, 0.72, 32);
        const nose = new THREE.Mesh(noseGeo, this.rocketMat);
        nose.position.y = 0.76;
        this.rocketGroup.add(nose);

        const collarGeo = new THREE.TorusGeometry(0.365, 0.035, 16, 32);
        const collar = new THREE.Mesh(collarGeo, this.accentMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.4;
        this.rocketGroup.add(collar);

        // Chrome Nose Tip
        const tipGeo = new THREE.ConeGeometry(0.18, 0.35, 24);
        const tip = new THREE.Mesh(tipGeo, this.chromeMat);
        tip.position.y = 1.22;
        this.rocketGroup.add(tip);

        // 3. Dark Tinted Visor Backing & Visor Face
        const visorBackGeo = new THREE.SphereGeometry(0.34, 32, 16);
        const visorBackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const visorBack = new THREE.Mesh(visorBackGeo, visorBackMat);
        visorBack.position.set(0, 0.35, 0.46);
        this.rocketGroup.add(visorBack);

        const visorGeo = new THREE.SphereGeometry(0.35, 32, 16);
        this.visorMat = new THREE.MeshBasicMaterial({
            map: this.faceTexture,
            transparent: true
        });
        const visor = new THREE.Mesh(visorGeo, this.visorMat);
        visor.position.set(0, 0.35, 0.48);
        this.rocketGroup.add(visor);

        // 4. Fins
        for (let i = 0; i < 3; i++) {
            const finGeo = new THREE.BoxGeometry(0.12, 0.6, 0.4);
            const fin = new THREE.Mesh(finGeo, this.chromeMat);
            fin.rotation.y = (i * Math.PI * 2) / 3;
            fin.position.y = -0.55;
            this.rocketGroup.add(fin);
        }

        // 5. Thruster Cone & Flame
        const coneGeo = new THREE.CylinderGeometry(0.36, 0.26, 0.32, 24, 1, true);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = -1.16;
        this.rocketGroup.add(cone);

        const flameGeo = new THREE.ConeGeometry(0.24, 0.7, 16);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.rotation.x = Math.PI;
        flame.position.y = -1.45;
        this.rocketGroup.add(flame);

        this.rocketGroup.scale.set(0.85, 0.85, 0.85);
        this.scene.add(this.rocketGroup);
    },

    drawFace(state: string): void {
        if (!this.faceCtx) return;
        const ctx = this.faceCtx;
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = '#00f0ff'; // Cyan glowing LED eyes
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        if (state === 'blink') {
            ctx.fillRect(55, 120, 50, 8);
            ctx.fillRect(151, 120, 50, 8);
        } else {
            // Friendly upward curved arcs
            ctx.beginPath();
            ctx.arc(80, 126, 24, Math.PI * 1.15, Math.PI * 1.85, false);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(176, 126, 24, Math.PI * 1.15, Math.PI * 1.85, false);
            ctx.stroke();

            // Smiling mouth
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(128, 156, 16, 0.2, Math.PI - 0.2, false);
            ctx.stroke();
        }
        if (this.faceTexture) this.faceTexture.needsUpdate = true;
    },

    startLoop(): void {
        if (this.isRendering) return;
        this.isRendering = true;
        const render = () => {
            if (!this.isRendering) return;
            this.time += 0.035;
            if (this.rocketGroup) {
                this.rocketGroup.position.y = Math.sin(this.time * 2) * 0.08;
                this.rocketGroup.rotation.y = 0.42 + Math.sin(this.time * 1.2) * 0.15;
                this.rocketGroup.rotation.z = -0.18 + Math.cos(this.time * 1.5) * 0.04;
            }
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            this.rafId = requestAnimationFrame(render);
        };
        this.rafId = requestAnimationFrame(render);
    },

    pauseLoop(): void {
        this.isRendering = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
    },

    setPaused(paused: boolean): void {
        if (paused) this.pauseLoop();
        else if (!this.isTabHidden && this.enabled) this.startLoop();
    },

    setEnabled(enabled: boolean): void {
        this.enabled = !!enabled;
        if (this.stage) {
            if (this.enabled) this.stage.classList.remove('hidden-offscreen');
            else this.stage.classList.add('hidden-offscreen');
        }
        if (this.enabled) this.startLoop();
        else this.pauseLoop();
    },

    updateThemeColor(colorHex: string): void {
        if (this.accentMat) {
            try { this.accentMat.color.set(colorHex); } catch {}
        }
    },

    applySkin(skinId: string): void {
        // Interop skin switcher
    }
};

if (typeof window !== 'undefined') {
    if (!(window as any).Cosmo) (window as any).Cosmo = CosmoCompanion;
    if (!(window as any).Cosmor) (window as any).Cosmor = CosmoCompanion;
}
