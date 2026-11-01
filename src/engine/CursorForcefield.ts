// CursorForcefield.ts – Spatial Reactive Forcefield of Isosceles Triangles
// Features:
// - Powerful cursor gravitational attraction pulling triangles tip-first towards pointer.
// - An invisible forcefield bubble around cursor keeping pointer completely clear (no drawn borders).
// - Exact isosceles triangles oriented strictly tip-first towards the cursor.
// - Progressive intensity ramping to a blazing highpoint at the boundary with kinetic pushing sensation.
// - Minimalist, uncluttered random dynamic bonds between nearby triangles.

interface TrianglePart {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;       // radians, tip strictly oriented towards cursor
    length: number;      // isosceles altitude (tip to base)
    halfWidth: number;   // half of base width
    speedFactor: number;
    pushEnergy: number;  // current kinetic tension against forcefield
    intensity: number;   // 0.15 (ambient) -> 1.0 (peak at boundary)
    activeBonds: number; // current bond count to prevent clutter
}

interface Bond {
    a: number;
    b: number;
    life: number;
    maxLife: number;
}

export const CursorForcefield = {
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,

    // Configuration
    TRIANGLE_COUNT: 110,
    FORCEFIELD_RADIUS: 52,        // invisible bubble radius keeping cursor clear
    GRAVITY_BASE: 0.85,           // strong gravitational acceleration
    MAX_VELOCITY: 8.5,            // top speed during gravitational rush
    DRAG: 0.935,                  // fluid aerodynamic drag
    BOND_DISTANCE: 60,            // max distance to form an energy bond
    MAX_BONDS_PER_TRI: 2,         // keeps visual aesthetic calm and uncluttered

    // State
    triangles: [] as TrianglePart[],
    bonds: [] as Bond[],
    mouseX: -1,
    mouseY: -1,
    rafId: 0,
    time: 0,
    dpr: 1,

    init(): void {
        if (typeof window === 'undefined') return;

        // Check if canvas already exists
        let canvas = document.getElementById('cursor-forcefield-canvas') as HTMLCanvasElement | null;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'cursor-forcefield-canvas';
            canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;';
            document.body.appendChild(canvas);
        }
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Default mouse to screen center until user moves
        if (this.mouseX < 0 || this.mouseY < 0) {
            this.mouseX = window.innerWidth * 0.5;
            this.mouseY = window.innerHeight * 0.45;
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('pointermove', (e: PointerEvent) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Seed triangles
        this.triangles = [];
        this.bonds = [];
        for (let i = 0; i < this.TRIANGLE_COUNT; i++) {
            this.triangles.push(this.createTriangle(i));
        }

        cancelAnimationFrame(this.rafId);
        this.loop();
    },

    resize(): void {
        if (!this.canvas) return;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(window.innerWidth * this.dpr);
        this.canvas.height = Math.floor(window.innerHeight * this.dpr);
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        if (this.ctx) {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
    },

    createTriangle(id: number): TrianglePart {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Distribute around viewport edges and space
        const length = 13 + Math.random() * 8; // altitude
        const halfWidth = 3.5 + Math.random() * 2.5; // base = 7 to 12px
        return {
            id,
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            angle: 0,
            length,
            halfWidth,
            speedFactor: 0.8 + Math.random() * 0.5,
            pushEnergy: 0,
            intensity: 0.2,
            activeBonds: 0,
        };
    },

    update(): void {
        this.time += 0.016;
        const targetX = this.mouseX;
        const targetY = this.mouseY;
        const fieldR = this.FORCEFIELD_RADIUS;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Reset active bond counters
        for (const tri of this.triangles) {
            tri.activeBonds = 0;
        }

        for (let i = 0; i < this.triangles.length; i++) {
            const tri = this.triangles[i];
            const dx = targetX - tri.x;
            const dy = targetY - tri.y;
            const dist = Math.hypot(dx, dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;

            // Strict tip-to-pointer orientation
            tri.angle = Math.atan2(dy, dx);

            // Gravitational Pull Calculation:
            // Pull intensifies as distance decreases, pulling them decisively into the attractor
            const pullDistanceFactor = Math.max(0.35, 1 - Math.min(dist, 900) / 900);
            const gravForce = this.GRAVITY_BASE * (1.2 + pullDistanceFactor * 3.8) * tri.speedFactor;

            tri.vx += ux * gravForce;
            tri.vy += uy * gravForce;

            // Apply aerodynamic drag
            tri.vx *= this.DRAG;
            tri.vy *= this.DRAG;

            // Clamp max velocity
            const currentSpeed = Math.hypot(tri.vx, tri.vy);
            if (currentSpeed > this.MAX_VELOCITY) {
                const ratio = this.MAX_VELOCITY / currentSpeed;
                tri.vx *= ratio;
                tri.vy *= ratio;
            }

            // Advance position
            tri.x += tri.vx;
            tri.y += tri.vy;

            // Forcefield collision & pushing dynamics:
            // The cursor has an invisible forcefield (NO visible border).
            // When triangle tip reaches fieldR, it cannot enter.
            const newDx = targetX - tri.x;
            const newDy = targetY - tri.y;
            const newDist = Math.hypot(newDx, newDy) || 1;

            if (newDist < fieldR) {
                // Arrest penetration: push tip right back to the invisible boundary
                const nux = newDx / newDist;
                const nuy = newDy / newDist;
                tri.x = targetX - nux * fieldR;
                tri.y = targetY - nuy * fieldR;

                // Triangles actively try to push in:
                // Radial inward velocity becomes push tension
                tri.pushEnergy = Math.min(1.0, tri.pushEnergy + 0.12);

                // Deflect radial speed into tangential sliding along the perimeter
                const tangentX = -nuy;
                const tangentY = nux;
                const tangentialSpeed = (tri.vx * tangentX + tri.vy * tangentY);
                tri.vx = tangentX * tangentialSpeed * 0.95;
                tri.vy = tangentY * tangentialSpeed * 0.95;

                // Subtle repulsion between crowded triangles at the forcefield boundary
                for (let j = i + 1; j < this.triangles.length; j++) {
                    const other = this.triangles[j];
                    const ox = other.x - tri.x;
                    const oy = other.y - tri.y;
                    const oDist = Math.hypot(ox, oy);
                    if (oDist > 0 && oDist < 26) {
                        const repForce = (26 - oDist) * 0.06;
                        const repX = (ox / oDist) * repForce;
                        const repY = (oy / oDist) * repForce;
                        tri.x -= repX;
                        tri.y -= repY;
                        other.x += repX;
                        other.y += repY;
                    }
                }
            } else {
                // Decay push energy when outside contact zone
                tri.pushEnergy = Math.max(0, tri.pushEnergy - 0.04);
            }

            // Intensity: picks up intensity approaching cursor, reaches highpoint (1.0) and becomes constant
            const distanceToBoundary = Math.max(0, newDist - fieldR);
            if (distanceToBoundary < 30) {
                // At the forcefield boundary: constant peak intensity
                tri.intensity = 1.0;
            } else {
                // Smooth ramp from ambient (0.2) to peak (1.0) over 320px
                const proximity = Math.max(0, 1.0 - distanceToBoundary / 340);
                tri.intensity = 0.2 + proximity * 0.8;
            }

            // Screen boundary wrapping
            const margin = 40;
            if (tri.x < -margin) tri.x = w + margin;
            if (tri.x > w + margin) tri.x = -margin;
            if (tri.y < -margin) tri.y = h + margin;
            if (tri.y > h + margin) tri.y = -margin;
        }

        // Manage Dynamic Bonds: make and break randomly between close triangles
        // Prune dead bonds
        for (let b = this.bonds.length - 1; b >= 0; b--) {
            const bond = this.bonds[b];
            bond.life--;
            const tA = this.triangles[bond.a];
            const tB = this.triangles[bond.b];
            if (!tA || !tB || bond.life <= 0) {
                this.bonds.splice(b, 1);
                continue;
            }
            const d = Math.hypot(tA.x - tB.x, tA.y - tB.y);
            if (d > this.BOND_DISTANCE * 1.3) {
                this.bonds.splice(b, 1);
                continue;
            }
            tA.activeBonds++;
            tB.activeBonds++;
        }

        // Randomly attempt new bonds when triangles are in high-intensity proximity
        if (this.bonds.length < 35) {
            for (let i = 0; i < this.triangles.length; i++) {
                const tA = this.triangles[i];
                if (tA.activeBonds >= this.MAX_BONDS_PER_TRI || tA.intensity < 0.45) continue;

                for (let j = i + 1; j < this.triangles.length; j++) {
                    const tB = this.triangles[j];
                    if (tB.activeBonds >= this.MAX_BONDS_PER_TRI || tB.intensity < 0.45) continue;

                    const d = Math.hypot(tA.x - tB.x, tA.y - tB.y);
                    if (d < this.BOND_DISTANCE && Math.random() < 0.08) {
                        const exists = this.bonds.some(b => (b.a === i && b.b === j) || (b.a === j && b.b === i));
                        if (!exists) {
                            const life = Math.floor(35 + Math.random() * 45);
                            this.bonds.push({ a: i, b: j, life, maxLife: life });
                            tA.activeBonds++;
                            tB.activeBonds++;
                            break;
                        }
                    }
                }
            }
        }
    },

    render(): void {
        const ctx = this.ctx;
        if (!ctx) return;

        // Clear transparent canvas (NO field borders or circles drawn)
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // 1. Render delicate energy bonds first (subtle background network)
        ctx.lineWidth = 0.8;
        for (const bond of this.bonds) {
            const tA = this.triangles[bond.a];
            const tB = this.triangles[bond.b];
            if (!tA || !tB) continue;

            const lifeRatio = Math.sin((bond.life / bond.maxLife) * Math.PI);
            const bondIntensity = Math.min(tA.intensity, tB.intensity);
            const alpha = lifeRatio * bondIntensity * 0.38;

            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(tA.x, tA.y);
            ctx.lineTo(tB.x, tB.y);
            ctx.stroke();
        }

        // 2. Render Isosceles Triangles:
        // Strictly isosceles with sharp tip pointing directly at the pointer
        for (const tri of this.triangles) {
            ctx.save();

            // High-tension kinetic vibration when pushing against the forcefield
            let jitterX = 0;
            let jitterY = 0;
            if (tri.pushEnergy > 0.05) {
                const jFreq = this.time * 30 + tri.id * 1.7;
                const jMag = tri.pushEnergy * 1.6;
                jitterX = Math.sin(jFreq) * jMag;
                jitterY = Math.cos(jFreq * 1.3) * jMag;
            }

            ctx.translate(tri.x + jitterX, tri.y + jitterY);
            ctx.rotate(tri.angle);

            const int = tri.intensity; // 0.2 -> 1.0

            // Isosceles geometry:
            // Tip is at (0, 0)
            // Base is at distance (-L) backwards along the local axis
            // Two equal sides connect (-L, -halfWidth) to (0,0) and (-L, +halfWidth) to (0,0)
            // Since the local coordinate system is rotated by angle = atan2(dy, dx),
            // the tip at (0, 0) points EXACTLY at the cursor!
            const L = tri.length;
            const W2 = tri.halfWidth;

            ctx.beginPath();
            ctx.moveTo(0, 0);       // Apex Tip (faces cursor directly)
            ctx.lineTo(-L, -W2);    // Base Corner 1
            ctx.lineTo(-L, W2);     // Base Corner 2
            ctx.closePath();

            // Dynamic Intensity Visuals:
            // As they approach and push against the invisible field, colors shift from
            // translucent cyan to electric neon white-cyan with intense specular bloom
            if (int > 0.75) {
                // Highpoint intensity glow
                ctx.shadowBlur = 10 * int;
                ctx.shadowColor = 'rgba(0, 245, 255, 0.9)';
                ctx.fillStyle = `rgba(0, 245, 255, ${(0.35 + int * 0.55).toFixed(2)})`;
                ctx.strokeStyle = `rgba(220, 255, 255, ${(0.5 + int * 0.5).toFixed(2)})`;
                ctx.lineWidth = 1.4;
            } else {
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(0, 220, 255, ${(0.15 + int * 0.35).toFixed(2)})`;
                ctx.strokeStyle = `rgba(0, 220, 255, ${(0.25 + int * 0.3).toFixed(2)})`;
                ctx.lineWidth = 1.0;
            }

            ctx.fill();
            ctx.stroke();

            // Specular tip highlight when at high intensity (pushing against barrier)
            if (int >= 0.85) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    loop(): void {
        this.update();
        this.render();
        this.rafId = requestAnimationFrame(() => this.loop());
    },

    setActive(active: boolean): void {
        if (!this.canvas) return;
        this.canvas.style.display = active ? 'block' : 'none';
        cancelAnimationFrame(this.rafId);
        if (active) {
            this.loop();
        }
    },
};
