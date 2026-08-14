/**
 * Deterministic PRNG using Mulberry32 algorithm.
 */
export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a float in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in range [min, max]
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Selects a random element from an array
   */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  getState(): number {
    return this.state >>> 0;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * 2D Seeded Simplex-like Value Noise for organic species clustering
 */
export function create2DNoise(seed: number) {
  const prng = new PRNG(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    const temp = p[i];
    p[i] = p[j];
    p[j] = temp;
  }
  const perm = new Uint8Array(512);
  const gradP = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    gradP[i] = perm[i] % 8;
  }

  const grad2d = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  function dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  return function noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const n00 = dot(grad2d[gradP[X + perm[Y]]], xf, yf);
    const n01 = dot(grad2d[gradP[X + perm[Y + 1]]], xf, yf - 1);
    const n10 = dot(grad2d[gradP[X + 1 + perm[Y]]], xf - 1, yf);
    const n11 = dot(grad2d[gradP[X + 1 + perm[Y + 1]]], xf - 1, yf - 1);

    const x1 = lerp(n00, n10, u);
    const x2 = lerp(n01, n11, u);

    return lerp(x1, x2, v); // Range approximately [-1, 1]
  };
}
