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

    // Animation & State
    isRendering: false,
    isTabHidden: false,
    isZenActive: false,
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
        const amb = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(amb);
        const dir = new THREE.DirectionalLight(0x93c5fd, 1.4);
        dir.position.set(5, 8, 5);
        this.scene.add(dir);

        // 5. Rocket Model Group
        this.buildModel();

        // 6. Intelligent Visibility & GPU Render Pause Hooks
        document.addEventListener('visibilitychange', () => {
            this.isTabHidden = document.hidden;
            if (this.isTabHidden) {
                this.pauseLoop();
            } else if (!this.isZenActive) {
                this.startLoop();
            }
        });

        window.addEventListener('focusr:zen-toggle', ((e: CustomEvent) => {
            this.isZenActive = !!e.detail?.active;
            if (this.isZenActive) {
                this.pauseLoop();
            } else if (!this.isTabHidden) {
                this.startLoop();
            }
        }) as EventListener);

        this.startLoop();
    },

    buildModel(): void {
        if (!this.scene) return;
        this.rocketGroup = new THREE.Group();

        // Fuselage
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.8, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1e1b4b,
            metalness: 0.85,
            roughness: 0.2
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.rocketGroup.add(body);

        // Visor with dynamic LED Canvas
        const visorGeo = new THREE.SphereGeometry(0.35, 32, 16);
        const visorMat = new THREE.MeshBasicMaterial({
            map: this.faceTexture,
            transparent: true
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.35, 0.5);
        this.rocketGroup.add(visor);

        // Thruster Cone
        const coneGeo = new THREE.ConeGeometry(0.4, 0.6, 32);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.9, roughness: 0.1 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(0, -1.0, 0);
        this.rocketGroup.add(cone);

        this.scene.add(this.rocketGroup);
    },

    drawFace(state: string): void {
        if (!this.faceCtx) return;
        const ctx = this.faceCtx;
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = '#10b981'; // Mint LED eyes

        if (state === 'blink') {
            ctx.fillRect(60, 120, 45, 6);
            ctx.fillRect(151, 120, 45, 6);
        } else {
            // Friendly curved digital eyes
            ctx.beginPath();
            ctx.arc(82, 120, 18, 0, Math.PI * 2);
            ctx.arc(174, 120, 18, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.faceTexture) this.faceTexture.needsUpdate = true;
    },

    startLoop(): void {
        if (this.isRendering) return;
        this.isRendering = true;
        const render = () => {
            if (!this.isRendering) return;
            this.time += 0.03;
            if (this.rocketGroup) {
                this.rocketGroup.position.y = Math.sin(this.time * 2) * 0.1;
                this.rocketGroup.rotation.y = Math.sin(this.time) * 0.2;
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
        else if (!this.isTabHidden) this.startLoop();
    }
};

if (typeof window !== 'undefined') {
    (window as any).Cosmo = CosmoCompanion;
    (window as any).Cosmor = CosmoCompanion;
}
