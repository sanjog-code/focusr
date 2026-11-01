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
    koalaGroup: null as THREE.Group | null,
    koalaHead: null as THREE.Group | null,
    koalaEars: [] as THREE.Group[],
    
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

        // 6. Cute 3D Procedural Koala Clinging to Rocket
        const koalaGroup = new THREE.Group();
        this.koalaGroup = koalaGroup;
        this.koalaEars = [];

        const kFurMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.88,
            metalness: 0.04
        });
        const kFluffMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.95,
            metalness: 0.0
        });
        const kNoseMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.35,
            metalness: 0.1
        });
        const kEyeMat = new THREE.MeshStandardMaterial({
            color: 0x020617,
            roughness: 0.05,
            metalness: 0.2
        });
        const kHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const kCheekMat = new THREE.MeshBasicMaterial({
            color: 0xf472b6,
            transparent: true,
            opacity: 0.55
        });
        const kPawMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.7,
            metalness: 0.05
        });
        const kGoggleRimMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.2,
            metalness: 0.85
        });
        const kGoggleLensMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.7
        });
        const kStrapMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.8
        });

        // Body & Tummy
        const kBodyGeo = new THREE.SphereGeometry(0.18, 18, 18);
        kBodyGeo.scale(0.9, 1.12, 0.8);
        const kBody = new THREE.Mesh(kBodyGeo, kFurMat);
        koalaGroup.add(kBody);

        const kTummyGeo = new THREE.SphereGeometry(0.13, 14, 14);
        kTummyGeo.scale(0.75, 0.95, 0.35);
        const kTummy = new THREE.Mesh(kTummyGeo, kFluffMat);
        kTummy.position.set(0, -0.02, 0.12);
        koalaGroup.add(kTummy);

        // Head Group – position head and tilt snug against rocket head
        const kHeadGroup = new THREE.Group();
        kHeadGroup.position.set(0, 0.22, 0.04);
        kHeadGroup.rotation.set(-0.15, -0.22, -0.38);
        this.koalaHead = kHeadGroup;
        koalaGroup.add(kHeadGroup);

        const kHeadGeo = new THREE.SphereGeometry(0.20, 22, 20);
        kHeadGeo.scale(1.08, 0.98, 0.98);
        const kHead = new THREE.Mesh(kHeadGeo, kFurMat);
        kHeadGroup.add(kHead);

        // Chubby Cheeks & Blush
        [-0.12, 0.12].forEach(cx => {
            const cheekGeo = new THREE.SphereGeometry(0.08, 12, 12);
            cheekGeo.scale(1.0, 0.85, 0.8);
            const cheek = new THREE.Mesh(cheekGeo, kFurMat);
            cheek.position.set(cx, -0.05, 0.08);
            kHeadGroup.add(cheek);

            const blushGeo = new THREE.SphereGeometry(0.038, 10, 10);
            const blush = new THREE.Mesh(blushGeo, kCheekMat);
            blush.position.set(cx * 1.05, -0.04, 0.14);
            kHeadGroup.add(blush);
        });

        // Fluffy Ears with Tufts
        [-0.18, 0.18].forEach((ex, idx) => {
            const earGroup = new THREE.Group();
            earGroup.position.set(ex, 0.14, -0.02);
            earGroup.rotation.z = idx === 0 ? 0.35 : -0.35;
            earGroup.rotation.y = idx === 0 ? -0.2 : 0.2;

            const outerGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.035, 18);
            outerGeo.rotateX(Math.PI / 2);
            const outer = new THREE.Mesh(outerGeo, kFurMat);
            earGroup.add(outer);

            const innerGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.04, 18);
            innerGeo.rotateX(Math.PI / 2);
            const inner = new THREE.Mesh(innerGeo, kFluffMat);
            inner.position.z = 0.005;
            earGroup.add(inner);

            for (let i = -1; i <= 1; i++) {
                const tuftGeo = new THREE.SphereGeometry(0.04, 8, 8);
                const tuft = new THREE.Mesh(tuftGeo, kFluffMat);
                tuft.position.set(idx === 0 ? -0.09 : 0.09, i * 0.045, 0.01);
                earGroup.add(tuft);
            }

            kHeadGroup.add(earGroup);
            this.koalaEars.push(earGroup);
        });

        // Nose
        const kNoseGeo = new THREE.SphereGeometry(0.072, 16, 16);
        kNoseGeo.scale(0.78, 1.25, 0.65);
        const kNose = new THREE.Mesh(kNoseGeo, kNoseMat);
        kNose.position.set(0, -0.01, 0.18);
        kNose.rotation.x = -0.08;
        kHeadGroup.add(kNose);

        // Eyes with Glints
        [-0.085, 0.085].forEach((eyex) => {
            const eyeGeo = new THREE.SphereGeometry(0.032, 14, 14);
            const eye = new THREE.Mesh(eyeGeo, kEyeMat);
            eye.position.set(eyex, 0.035, 0.165);
            kHeadGroup.add(eye);

            const glintGeo = new THREE.SphereGeometry(0.009, 8, 8);
            const glint = new THREE.Mesh(glintGeo, kHighlightMat);
            glint.position.set(eyex + 0.01, 0.045, 0.19);
            kHeadGroup.add(glint);
        });

        // Mini Goggles
        const kGoggleGroup = new THREE.Group();
        kGoggleGroup.position.set(0, 0.14, 0.12);
        kGoggleGroup.rotation.x = -0.35;

        const strapGeo = new THREE.TorusGeometry(0.19, 0.016, 8, 24);
        const strap = new THREE.Mesh(strapGeo, kStrapMat);
        strap.rotation.x = Math.PI / 2;
        kGoggleGroup.add(strap);

        [-0.075, 0.075].forEach(gx => {
            const rimGeo = new THREE.TorusGeometry(0.05, 0.014, 10, 20);
            const rim = new THREE.Mesh(rimGeo, kGoggleRimMat);
            rim.position.x = gx;
            kGoggleGroup.add(rim);

            const lensGeo = new THREE.CircleGeometry(0.045, 16);
            const lens = new THREE.Mesh(lensGeo, kGoggleLensMat);
            lens.position.set(gx, 0, 0.005);
            kGoggleGroup.add(lens);
        });
        kHeadGroup.add(kGoggleGroup);

        koalaGroup.add(kHeadGroup);

        // Clinging Hug Arms
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.14, 0.08, 0.08);
        const leftArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.22, 12);
        leftArmGeo.rotateZ(Math.PI / 3);
        leftArmGeo.rotateY(0.4);
        const leftArm = new THREE.Mesh(leftArmGeo, kFurMat);
        leftArmGroup.add(leftArm);

        const leftPawGeo = new THREE.SphereGeometry(0.045, 10, 10);
        const leftPaw = new THREE.Mesh(leftPawGeo, kPawMat);
        leftPaw.position.set(-0.14, -0.04, 0.12);
        leftArmGroup.add(leftPaw);
        koalaGroup.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.14, 0.08, 0.08);
        const rightArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.22, 12);
        rightArmGeo.rotateZ(-Math.PI / 3);
        rightArmGeo.rotateY(-0.4);
        const rightArm = new THREE.Mesh(rightArmGeo, kFurMat);
        rightArmGroup.add(rightArm);

        const rightPawGeo = new THREE.SphereGeometry(0.045, 10, 10);
        const rightPaw = new THREE.Mesh(rightPawGeo, kPawMat);
        rightPaw.position.set(0.14, -0.04, 0.12);
        rightArmGroup.add(rightPaw);
        koalaGroup.add(rightArmGroup);

        // Clinging Legs
        [-0.12, 0.12].forEach((lx, idx) => {
            const legGroup = new THREE.Group();
            legGroup.position.set(lx, -0.14, 0.06);

            const legGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.2, 10);
            legGeo.rotateZ(idx === 0 ? 0.5 : -0.5);
            legGeo.rotateX(0.4);
            const leg = new THREE.Mesh(legGeo, kFurMat);
            legGroup.add(leg);

            const footGeo = new THREE.SphereGeometry(0.048, 10, 10);
            footGeo.scale(1, 0.8, 1.2);
            const foot = new THREE.Mesh(footGeo, kPawMat);
            foot.position.set(idx === 0 ? -0.08 : 0.08, -0.08, 0.08);
            legGroup.add(foot);

            koalaGroup.add(legGroup);
        });

        // Tail
        const tailGeo = new THREE.SphereGeometry(0.05, 10, 10);
        const tail = new THREE.Mesh(tailGeo, kFurMat);
        tail.position.set(0, -0.14, -0.14);
        koalaGroup.add(tail);

        // Mount Koala sized up and positioned so head rests affectionately on the rocket's head
        koalaGroup.scale.set(1.4, 1.4, 1.4);
        koalaGroup.position.set(0.28, 0.52, 0.22);
        koalaGroup.rotation.set(0.16, -0.52, -0.32);
        this.rocketGroup.add(koalaGroup);

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
            if (this.koalaGroup) {
                const koalaBreathe = Math.sin(this.time * 3.5) * 0.008;
                this.koalaGroup.position.y = 0.52 + koalaBreathe;
                if (this.koalaHead) {
                    this.koalaHead.rotation.z = -0.38 + Math.sin(this.time * 1.8) * 0.03;
                    this.koalaHead.rotation.x = -0.15 + Math.sin(this.time * 2.2) * 0.02;
                }
                if (this.koalaEars && this.koalaEars.length === 2) {
                    const earWiggle = Math.sin(this.time * 4.5) * 0.04;
                    this.koalaEars[0].rotation.z = 0.35 + earWiggle;
                    this.koalaEars[1].rotation.z = -0.35 - earWiggle;
                }
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
