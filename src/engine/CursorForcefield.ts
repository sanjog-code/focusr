// CursorForcefield.ts – Cursor-centric force-field of isosceles triangles
// The effect draws triangles that continuously attract tip-first toward the mouse.
// The canvas is transparent except for the triangles – no visible border around the field.

interface TrianglePart {
    x: number;
    y: number;
    angle: number;  // radians, tip points toward cursor
    size: number;   // base pixel length
    speed: number;
}

export const CursorForcefield = {
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,

    // Configuration
    TRIANGLE_COUNT: 120,
    MAX_SIZE: 18,
    MAX_SPEED: 0.6,
    GRAVITY_MULTIPLIER: 2.5,

    // State
    triangles: [] as TrianglePart[],
    mouseX: 0,
    mouseY: 0,
    rafId: 0,

    init(): void {
        // Full-screen transparent overlay (never blocks UI clicks)
        const canvas = document.createElement('canvas');
        canvas.id = 'cursor-forcefield-canvas';
        canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;';
        document.body.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('pointermove', (e: PointerEvent) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Seed triangles at random viewport positions
        this.triangles = [];
        for (let i = 0; i < this.TRIANGLE_COUNT; i++) {
            this.triangles.push(this.createTriangle());
        }

        this.loop();
    },

    resize(): void {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    createTriangle(): TrianglePart {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            angle: Math.random() * Math.PI * 2,
            size: Math.random() * this.MAX_SIZE + 4,
            speed: Math.random() * this.MAX_SPEED + 0.1,
        };
    },

    updateTriangles(): void {
        for (const tri of this.triangles) {
            const dx = this.mouseX - tri.x;
            const dy = this.mouseY - tri.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            tri.x += ux * tri.speed * this.GRAVITY_MULTIPLIER;
            tri.y += uy * tri.speed * this.GRAVITY_MULTIPLIER;

            // Wrap around screen edges
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (tri.x < -tri.size) tri.x = w + tri.size;
            if (tri.x > w + tri.size) tri.x = -tri.size;
            if (tri.y < -tri.size) tri.y = h + tri.size;
            if (tri.y > h + tri.size) tri.y = -tri.size;

            // Tip always points toward cursor
            tri.angle = Math.atan2(uy, ux);
        }
    },

    render(): void {
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.42)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
        ctx.lineWidth = 1.2;

        for (const tri of this.triangles) {
            ctx.save();
            ctx.translate(tri.x, tri.y);
            ctx.rotate(tri.angle);
            // Isosceles triangle: tip at origin, base behind
            const h = tri.size * 2.2;
            const half = tri.size * 0.45;
            ctx.beginPath();
            ctx.moveTo(0, 0);        // tip
            ctx.lineTo(-half, -h);
            ctx.lineTo(half, -h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    },

    loop(): void {
        this.updateTriangles();
        this.render();
        this.rafId = requestAnimationFrame(() => this.loop());
    },

    setActive(active: boolean): void {
        if (!this.canvas) return;
        this.canvas.style.display = active ? 'block' : 'none';
        if (active) {
            cancelAnimationFrame(this.rafId);
            this.loop();
        } else {
            cancelAnimationFrame(this.rafId);
        }
    },
};
