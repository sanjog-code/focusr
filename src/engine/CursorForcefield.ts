// CursorForcefield.ts – Implements a cursor‑centric force‑field of isosceles triangles
// ---------------------------------------------------------------
// The effect draws a collection of thin isosceles triangles that constantly
// "attract" toward the mouse pointer. The attraction strength is configurable
// via `GRAVITY_MULTIPLIER`.  The visual border of the field is invisible – the
// canvas is fully transparent except for the triangles themselves.
// ---------------------------------------------------------------

import * as THREE from "three"; // Use Three for simple geometry math (no rendering)

export const CursorForcefield = {
  // DOM elements
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,

  // Configuration – can be tweaked at runtime
  TRIANGLE_COUNT: 120,
  MAX_SIZE: 18, // pixel length of triangle base
  MAX_SPEED: 0.6, // pixels per frame towards cursor
  GRAVITY_MULTIPLIER: 2.5, // stronger pull (default ~1)

  // Internal state
  triangles: [] as {
    x: number;
    y: number;
    angle: number; // orientation in radians (tip points toward cursor)
    size: number; // base length
    speed: number;
  }[],
  mousePos: { x: number; y: number } = { x: 0, y: 0 },
  rafId: 0,

  init(): void {
    // Create a full‑screen overlay canvas (pointer‑events none so it doesn't block UI)
    this.canvas = document.createElement("canvas");
    this.canvas.id = "cursor-forcefield-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.inset = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "5"; // below UI but above background layers
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", this.resize.bind(this));
    window.addEventListener("pointermove", this.updateMouse.bind(this));

    // Populate triangles at random positions
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

  updateMouse(e: PointerEvent): void {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;
  },

  createTriangle() {
    const size = Math.random() * this.MAX_SIZE + 4; // base length
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * this.MAX_SPEED + 0.1;
    return { x, y, angle, size, speed };
  },

  // Compute a unit vector from (x,y) toward mouse pointer
  vectorToMouse(x: number, y: number) {
    const dx = this.mousePos.x - x;
    const dy = this.mousePos.y - y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  },

  // Update each triangle's position and orientation
  updateTriangles(): void {
    for (const tri of this.triangles) {
      // Compute direction toward cursor
      const dir = this.vectorToMouse(tri.x, tri.y);

      // Move a fraction of the distance (strength amplified by multiplier)
      tri.x += dir.x * tri.speed * this.GRAVITY_MULTIPLIER;
      tri.y += dir.y * tri.speed * this.GRAVITY_MULTIPLIER;

      // Keep triangles within viewport – wrap around edges
      if (tri.x < -tri.size) tri.x = window.innerWidth + tri.size;
      if (tri.x > window.innerWidth + tri.size) tri.x = -tri.size;
      if (tri.y < -tri.size) tri.y = window.innerHeight + tri.size;
      if (tri.y > window.innerHeight + tri.size) tri.y = -tri.size;

      // Orientation: tip points toward cursor (angle of direction)
      tri.angle = Math.atan2(dir.y, dir.x);
    }
  },

  // Render all triangles as thin isosceles shapes (tip first)
  render(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "rgba(0, 255, 255, 0.45)"; // cyan‑ish glow, can be themed later
    ctx.strokeStyle = "rgba(0, 255, 255, 0.25)";
    ctx.lineWidth = 1.2;
    for (const tri of this.triangles) {
      ctx.save();
      ctx.translate(tri.x, tri.y);
      ctx.rotate(tri.angle);
      // Draw an isosceles triangle with tip at (0,0) and base behind it
      const length = tri.size * 2; // height of triangle
      const halfBase = tri.size / 2; // half of base width
      ctx.beginPath();
      ctx.moveTo(0, 0); // tip
      ctx.lineTo(-halfBase, -length);
      ctx.lineTo(halfBase, -length);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },

  loop(): void {
    this.updateTriangles();
    this.render();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  },

  // Public API to toggle visibility (useful for Zen mode)
  setActive(active: boolean): void {
    if (!this.canvas) return;
    this.canvas.style.display = active ? "block" : "none";
    if (active) {
      cancelAnimationFrame(this.rafId);
      this.loop();
    } else {
      cancelAnimationFrame(this.rafId);
    }
  },
};

// Expose to window for debugging / inter‑module communication
if (typeof window !== "undefined") {
  (window as any).CursorForcefield = CursorForcefield;
}
