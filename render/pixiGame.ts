import { Application, Container, Graphics, Sprite, Texture, RenderTexture } from 'pixi.js';
import { GAME_CONFIG, SpeciesId } from '../game/config';
import { GameEngine } from '../game/engine';
import { Camera } from './camera';
import { ParticlePool } from './effects';

interface TileSprite {
  sprite: Sprite;
  lastSpecies: string;
  lastRevealed: boolean;
  lastReinforcement: number;
  lastIsCore: boolean;
}

export class PixiGameRenderer {
  public app: Application;
  public camera: Camera;
  public engine: GameEngine;
  public particles: ParticlePool;

  private containerElement: HTMLElement;
  private worldContainer: Container;
  private tileMap: Map<string, TileSprite> = new Map();
  private particleGfx: Graphics;
  private hoverGfx: Graphics;
  private coreGfx: Graphics;

  // Pre-baked textures
  private hiddenTex!: Texture;
  private revealedTextures: Map<number, Texture> = new Map();
  private coreTex!: Texture;

  private hoverTileX: number | null = null;
  private hoverTileY: number | null = null;
  private isPointerDown = false;
  private pointerDownPos = { x: 0, y: 0 };
  private time = 0;
  private initialized = false;
  private destroyed = false;
  private resizeHandler: (() => void) | null = null;
  private unsubscribeEngine: (() => void) | null = null;

  // Animation state
  private revealAnims: Map<string, { t: number; species: SpeciesId; isPlayer: boolean }> = new Map();
  private corePulse = 0;

  constructor(container: HTMLElement, engine: GameEngine) {
    this.containerElement = container;
    this.engine = engine;
    this.app = new Application();
    this.camera = new Camera();
    this.particles = new ParticlePool(GAME_CONFIG.maxParticles);

    this.worldContainer = new Container();
    this.particleGfx = new Graphics();
    this.hoverGfx = new Graphics();
    this.coreGfx = new Graphics();
  }

  public async init() {
    if (this.destroyed) return;
    const width = this.containerElement.clientWidth || window.innerWidth;
    const height = this.containerElement.clientHeight || window.innerHeight;

    await this.app.init({
      width, height,
      backgroundColor: GAME_CONFIG.colors.bg,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: false,
    });

    if (this.destroyed) return;
    this.containerElement.appendChild(this.app.canvas);
    this.camera.resize(width, height);

    this.buildTextures();

    this.app.stage.addChild(this.worldContainer);
    this.worldContainer.addChild(this.coreGfx);
    this.worldContainer.addChild(this.hoverGfx);
    this.worldContainer.addChild(this.particleGfx);

    this.setupEvents();
    this.app.ticker.add((ticker) => this.update(ticker.deltaTime));
    this.camera.centerOnTile(0, 0);

    this.unsubscribeEngine = this.engine.subscribe(() => this.onEngineUpdate());

    this.initialized = true;
  }

  private buildTextures() {
    const s = GAME_CONFIG.tileSize;
    const r = GAME_CONFIG.tileRadius;
    const renderer = this.app.renderer;

    // Hidden tile texture
    const hg = new Graphics();
    hg.roundRect(0, 0, s, s, r);
    hg.fill({ color: GAME_CONFIG.colors.hiddenTile });
    hg.stroke({ color: GAME_CONFIG.colors.hiddenTileBorder, width: 0.5 });
    this.hiddenTex = renderer.generateTexture(hg);
    hg.destroy();

    // Species tile textures (white base, tinted at runtime)
    const rg = new Graphics();
    rg.roundRect(0, 0, s, s, r);
    rg.fill({ color: 0xffffff });
    const baseTex = renderer.generateTexture(rg);
    rg.destroy();
    // Store as "white" base texture to tint
    this.revealedTextures.set(0xffffff, baseTex);

    // Core texture
    const cg = new Graphics();
    cg.roundRect(0, 0, s, s, r);
    cg.fill({ color: 0xffffff });
    cg.roundRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6, r * 0.7);
    cg.fill({ color: 0xffffff, alpha: 0.5 });
    cg.circle(s / 2, s / 2, s * 0.15);
    cg.fill({ color: 0xffffff, alpha: 0.8 });
    this.coreTex = renderer.generateTexture(cg);
    cg.destroy();
  }

  private getBaseTexture(): Texture {
    return this.revealedTextures.get(0xffffff)!;
  }

  private setupEvents() {
    const canvas = this.app.canvas;
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      const pos = getPos(e);
      this.pointerDownPos = pos;
      this.camera.startDrag(pos.x, pos.y);
    });

    canvas.addEventListener('pointermove', (e) => {
      const pos = getPos(e);
      if (this.isPointerDown) this.camera.drag(pos.x, pos.y);
      const wp = this.camera.screenToWorld(pos.x, pos.y);
      const { tileX, tileY } = this.camera.worldToTile(wp.x, wp.y);
      this.hoverTileX = tileX;
      this.hoverTileY = tileY;
    });

    canvas.addEventListener('pointerup', (e) => {
      const pos = getPos(e);
      this.camera.endDrag();
      const dx = Math.abs(pos.x - this.pointerDownPos.x);
      const dy = Math.abs(pos.y - this.pointerDownPos.y);
      if (dx < 6 && dy < 6) {
        const wp = this.camera.screenToWorld(pos.x, pos.y);
        const { tileX, tileY } = this.camera.worldToTile(wp.x, wp.y);
        if (this.engine.isRepaintMode) {
          this.engine.repaintCell(tileX, tileY);
        } else {
          const cell = this.engine.world.getExistingCell(tileX, tileY);
          if (cell && cell.revealed && cell.currentSpeciesId !== this.engine.playerSpecies && !cell.isCore) {
            this.engine.attackCell(tileX, tileY);
          } else {
            this.engine.revealCell(tileX, tileY);
          }
        }
      }
      this.isPointerDown = false;
    });

    canvas.addEventListener('pointerleave', () => {
      this.hoverTileX = null;
      this.hoverTileY = null;
      if (this.isPointerDown) { this.camera.endDrag(); this.isPointerDown = false; }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getPos(e as unknown as PointerEvent);
      this.camera.zoomAt(pos.x, pos.y, e.deltaY < 0 ? 1.12 : 0.88);
    }, { passive: false });

    this.resizeHandler = () => {
      if (this.destroyed || !this.containerElement) return;
      const w = this.containerElement.clientWidth;
      const h = this.containerElement.clientHeight;
      this.app.renderer.resize(w, h);
      this.camera.resize(w, h);
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  private onEngineUpdate() {
    // Queue reveal animations
    for (const ev of this.engine.animEvents) {
      if (ev.type === 'reveal') {
        this.revealAnims.set(`${ev.x}:${ev.y}`, { t: 0, species: ev.species, isPlayer: ev.isPlayer });
      }
      if (ev.type === 'squareFill') {
        const step = GAME_CONFIG.tileSize + GAME_CONFIG.tileGap;
        const cx = ((ev.match.minX + ev.match.maxX) / 2) * step;
        const cy = ((ev.match.minY + ev.match.maxY) / 2) * step;
        const color = GAME_CONFIG.colors.species[ev.match.speciesId].hex;
        this.particles.burst(cx, cy, color, Math.min(ev.match.size * 6, 40));
      }
    }
  }

  private update(delta: number) {
    if (this.destroyed) return;
    this.time += delta * 0.04;
    this.corePulse += delta * 0.03;
    this.camera.update();

    // Camera transform
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    this.worldContainer.scale.set(this.camera.zoom);
    this.worldContainer.position.set(
      cx - this.camera.x * this.camera.zoom,
      cy - this.camera.y * this.camera.zoom
    );

    // Update reveal animations
    for (const [key, anim] of this.revealAnims) {
      anim.t += delta * 0.06;
      if (anim.t >= 1) this.revealAnims.delete(key);
    }

    // Particles
    this.particles.update(delta);
    this.particles.render(this.particleGfx);

    this.renderVisibleTiles();
    this.renderCore();
    this.renderHover();
  }

  private renderVisibleTiles() {
    const bounds = this.camera.getVisibleTileBounds();
    const tileSize = GAME_CONFIG.tileSize;
    const step = tileSize + GAME_CONFIG.tileGap;
    const zoom = this.camera.zoom;

    // LOD: at far zoom, skip detail
    const isCloseZoom = zoom > 0.7;
    const isFarZoom = zoom < 0.4;

    const activeKeys = new Set<string>();

    for (let tx = bounds.minTileX; tx <= bounds.maxTileX; tx++) {
      for (let ty = bounds.minTileY; ty <= bounds.maxTileY; ty++) {
        const key = `${tx}:${ty}`;
        activeKeys.add(key);

        const cell = this.engine.world.getCell(tx, ty);
        let entry = this.tileMap.get(key);

        const worldX = tx * step - tileSize / 2;
        const worldY = ty * step - tileSize / 2;

        if (!entry) {
          const sprite = new Sprite(this.hiddenTex);
          sprite.position.set(worldX, worldY);
          this.worldContainer.addChildAt(sprite, 0);
          entry = {
            sprite,
            lastSpecies: '',
            lastRevealed: false,
            lastReinforcement: 0,
            lastIsCore: false,
          };
          this.tileMap.set(key, entry);
        }

        const spr = entry.sprite;
        spr.visible = true;
        spr.position.set(worldX, worldY);

        if (!cell.revealed) {
          // Only update texture if state changed
          if (entry.lastRevealed !== false) {
            spr.texture = this.hiddenTex;
            spr.tint = 0xffffff;
            spr.alpha = 1;
            spr.scale.set(1);
            entry.lastRevealed = false;
            entry.lastSpecies = '';
          }

          // Frontier hint: slightly brighter for cells adjacent to player
          if (isCloseZoom && this.engine.isAdjacentToPlayerTerritory(tx, ty)) {
            spr.tint = 0xccccff;
            spr.alpha = 0.7;
          } else {
            spr.tint = 0xffffff;
            spr.alpha = isFarZoom ? 0.3 : 0.5;
          }
        } else {
          // Revealed cell
          const speciesConfig = GAME_CONFIG.colors.species[cell.currentSpeciesId];
          const color = speciesConfig.hex;
          const speciesKey = cell.currentSpeciesId + (cell.strainId || '');

          if (entry.lastSpecies !== speciesKey || !entry.lastRevealed || entry.lastIsCore !== (cell.isCore ?? false)) {
            spr.texture = cell.isCore ? this.coreTex : this.getBaseTexture();
            spr.tint = color;
            entry.lastSpecies = speciesKey;
            entry.lastRevealed = true;
            entry.lastReinforcement = cell.reinforcement;
            entry.lastIsCore = cell.isCore ?? false;
          }

          spr.alpha = 1;

          // Reveal animation
          const revealAnim = this.revealAnims.get(key);
          if (revealAnim) {
            const t = revealAnim.t;
            // Ease out back
            const eased = 1 - Math.pow(1 - t, 3);
            const overshoot = t < 0.7 ? 1 + (1 - eased) * 0.15 : 1;
            spr.scale.set(eased * overshoot);
            spr.alpha = eased;
          } else {
            // Subtle breathing only for close zoom, only for reinforced tiles
            if (isCloseZoom && cell.reinforcement > 1) {
              const pulse = 1 + Math.sin(this.time + (tx + ty) * 0.4) * 0.01;
              spr.scale.set(pulse);
            } else {
              spr.scale.set(1);
            }
          }
        }
      }
    }

    // Hide off-screen tiles
    for (const [key, entry] of this.tileMap.entries()) {
      if (!activeKeys.has(key)) {
        entry.sprite.visible = false;
      }
    }
  }

  private renderCore() {
    this.coreGfx.clear();
    const step = GAME_CONFIG.tileSize + GAME_CONFIG.tileGap;
    const cx = this.engine.coreX * step;
    const cy = this.engine.coreY * step;
    const sp = GAME_CONFIG.colors.species[this.engine.playerSpecies];

    const pulse = 0.7 + Math.sin(this.corePulse * 1.5) * 0.3;
    const danger = this.engine.isCoreInDanger;
    const glowColor = danger ? 0xff2222 : sp.glowHex;

    // --- 1. PLAYER CORE ---
    const outerRadius = GAME_CONFIG.tileSize * 0.9 + Math.sin(this.corePulse * 0.8) * 4;
    this.coreGfx.circle(cx, cy, outerRadius);
    this.coreGfx.stroke({ color: glowColor, alpha: pulse * 0.5, width: 2.5 });

    const shieldRadius = GAME_CONFIG.tileSize * 0.5;
    this.coreGfx.circle(cx, cy, shieldRadius);
    this.coreGfx.fill({ color: glowColor, alpha: 0.25 });
    this.coreGfx.stroke({ color: 0xffffff, alpha: 0.8, width: 1.5 });

    const dSize = 8 + Math.sin(this.corePulse * 2) * 2;
    this.coreGfx.poly([cx, cy - dSize, cx + dSize, cy, cx, cy + dSize, cx - dSize, cy]);
    this.coreGfx.fill({ color: 0xffffff, alpha: 0.95 });

    if (danger) {
      const warnRadius = GAME_CONFIG.tileSize * 1.4 + Math.sin(this.corePulse * 6) * 6;
      this.coreGfx.circle(cx, cy, warnRadius);
      this.coreGfx.stroke({ color: 0xff0000, alpha: 0.6 + Math.sin(this.corePulse * 6) * 0.4, width: 3 });
    }

    // --- 2. ENEMY INTENTS TELEGRAPH ---
    for (const intent of this.engine.activeIntents) {
      const fx = intent.sourceX * step;
      const fy = intent.sourceY * step;
      const tx = intent.toX * step;
      const ty = intent.toY * step;
      const intentColor = GAME_CONFIG.colors.species[intent.sourceSpecies]?.hex || 0xff4444;

      // Draw thin animated attack tendril line
      this.coreGfx.moveTo(fx, fy);
      this.coreGfx.lineTo(tx, ty);
      this.coreGfx.stroke({ color: intentColor, alpha: 0.8, width: 2 });

      // Target pulsing box
      const half = GAME_CONFIG.tileSize / 2;
      const pPulse = 0.5 + Math.sin(this.time * 8) * 0.3;
      this.coreGfx.rect(tx - half, ty - half, GAME_CONFIG.tileSize, GAME_CONFIG.tileSize);
      this.coreGfx.stroke({ color: intentColor, alpha: pPulse, width: 2 });
    }

    // --- 3. ENEMY CORE ---
    if (this.engine.enemyCoreX !== null && this.engine.enemyCoreY !== null) {
      const ecx = this.engine.enemyCoreX * step;
      const ecy = this.engine.enemyCoreY * step;

      const ePulse = 0.8 + Math.sin(this.corePulse * 2) * 0.2;
      const eRadius = GAME_CONFIG.tileSize * 1.0 + Math.sin(this.corePulse * 1.2) * 5;

      this.coreGfx.circle(ecx, ecy, eRadius);
      this.coreGfx.stroke({ color: 0xff2244, alpha: ePulse * 0.8, width: 3 });

      this.coreGfx.moveTo(ecx - 14, ecy);
      this.coreGfx.lineTo(ecx + 14, ecy);
      this.coreGfx.stroke({ color: 0xff2244, alpha: 0.9, width: 2 });

      this.coreGfx.moveTo(ecx, ecy - 14);
      this.coreGfx.lineTo(ecx, ecy + 14);
      this.coreGfx.stroke({ color: 0xff2244, alpha: 0.9, width: 2 });

      this.coreGfx.poly([ecx, ecy - 7, ecx + 7, ecy, ecx, ecy + 7, ecx - 7, ecy]);
      this.coreGfx.fill({ color: 0xff2244, alpha: 1 });
    }
  }

  private renderHover() {
    this.hoverGfx.clear();
    if (this.hoverTileX === null || this.hoverTileY === null) return;
    if (this.engine.gameOver || this.engine.gameWon) return;

    const tileSize = GAME_CONFIG.tileSize;
    const step = tileSize + GAME_CONFIG.tileGap;
    const worldX = this.hoverTileX * step;
    const worldY = this.hoverTileY * step;
    const radius = GAME_CONFIG.tileRadius;

    const cell = this.engine.world.getCell(this.hoverTileX, this.hoverTileY);
    const isAdjacent = this.engine.isAdjacentToPlayerTerritory(this.hoverTileX, this.hoverTileY);
    const isEnemy = cell && cell.revealed && cell.currentSpeciesId !== this.engine.playerSpecies && !cell.isCore;
    const isHiddenFrontier = cell && !cell.revealed && isAdjacent;

    if (this.engine.isRepaintMode && (isEnemy || isHiddenFrontier)) {
      const repColor = GAME_CONFIG.colors.species[this.engine.playerSpecies].hex;
      this.hoverGfx.roundRect(worldX - tileSize / 2 - 2, worldY - tileSize / 2 - 2, tileSize + 4, tileSize + 4, radius + 2);
      this.hoverGfx.stroke({ color: repColor, alpha: 0.9, width: 2.5 });
    } else if (isEnemy && isAdjacent) {
      // Red hover outline for ATTACK action
      this.hoverGfx.roundRect(worldX - tileSize / 2 - 2, worldY - tileSize / 2 - 2, tileSize + 4, tileSize + 4, radius + 2);
      this.hoverGfx.stroke({ color: 0xff4444, alpha: 0.95, width: 2.5 });
    } else if (isHiddenFrontier) {
      // Bright cyan outline for REVEAL action
      this.hoverGfx.roundRect(worldX - tileSize / 2 - 2, worldY - tileSize / 2 - 2, tileSize + 4, tileSize + 4, radius + 2);
      this.hoverGfx.stroke({ color: 0x00f0ff, alpha: 0.9, width: 2.5 });
    } else if (cell && !cell.revealed) {
      this.hoverGfx.roundRect(worldX - tileSize / 2 - 2, worldY - tileSize / 2 - 2, tileSize + 4, tileSize + 4, radius + 2);
      this.hoverGfx.stroke({ color: 0x443355, alpha: 0.3, width: 1 });
    }
  }

  public destroy() {
    this.destroyed = true;
    if (this.resizeHandler) { window.removeEventListener('resize', this.resizeHandler); this.resizeHandler = null; }
    if (this.unsubscribeEngine) { this.unsubscribeEngine(); this.unsubscribeEngine = null; }
    if (this.initialized && this.app) {
      try {
        this.app.ticker.stop();
        this.app.stage.removeChildren();
        if (this.app.canvas?.parentElement) this.app.canvas.parentElement.removeChild(this.app.canvas);
        this.app.destroy(true);
      } catch (_) { /* ignore HMR cleanup errors */ }
    }
    this.tileMap.clear();
  }
}
