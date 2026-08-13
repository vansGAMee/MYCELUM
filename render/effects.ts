import { Graphics } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  active: boolean;
}

export class ParticlePool {
  private pool: Particle[];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.pool = [];
    for (let i = 0; i < maxSize; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: 0xffffff, active: false });
    }
  }

  private getParticle(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }

  public burst(cx: number, cy: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      if (!p) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 20 + Math.random() * 20;
      p.size = 1.5 + Math.random() * 2.5;
      p.color = color;
      p.active = true;
    }
  }

  public update(delta: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vx *= 0.95;
      p.vy *= 0.95;
      if (p.life >= p.maxLife) p.active = false;
    }
  }

  public render(gfx: Graphics) {
    gfx.clear();
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      gfx.circle(p.x, p.y, p.size * (1 - p.life / p.maxLife * 0.5));
      gfx.fill({ color: p.color, alpha });
    }
  }

  public activeCount(): number {
    let c = 0;
    for (const p of this.pool) if (p.active) c++;
    return c;
  }
}
