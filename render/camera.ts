import { GAME_CONFIG } from '../game/config';

export class Camera {
  public x: number = 0; // World X position (pixels)
  public y: number = 0; // World Y position (pixels)
  public zoom: number = 1.0;
  public targetZoom: number = 1.0;

  public minZoom: number = GAME_CONFIG.minZoom;
  public maxZoom: number = GAME_CONFIG.maxZoom;

  public viewportWidth: number = 800;
  public viewportHeight: number = 600;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  public resize(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public update() {
    // Smooth lerp zoom
    this.zoom += (this.targetZoom - this.zoom) * 0.15;
  }

  public startDrag(screenX: number, screenY: number) {
    this.isDragging = true;
    this.dragStartX = screenX;
    this.dragStartY = screenY;
    this.cameraStartX = this.x;
    this.cameraStartY = this.y;
  }

  public drag(screenX: number, screenY: number) {
    if (!this.isDragging) return;
    const dx = (screenX - this.dragStartX) / this.zoom;
    const dy = (screenY - this.dragStartY) / this.zoom;
    this.x = this.cameraStartX - dx;
    this.y = this.cameraStartY - dy;
  }

  public endDrag() {
    this.isDragging = false;
  }

  public zoomAt(screenX: number, screenY: number, deltaZoom: number) {
    const newTargetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * deltaZoom));
    if (newTargetZoom === this.targetZoom) return;

    // Zoom toward mouse pointer
    const worldBefore = this.screenToWorld(screenX, screenY);
    this.targetZoom = newTargetZoom;
    this.zoom = newTargetZoom; // Immediate response for cursor zooming
    const worldAfter = this.screenToWorld(screenX, screenY);

    this.x -= worldAfter.x - worldBefore.x;
    this.y -= worldAfter.y - worldBefore.y;
  }

  public centerOnTile(tileX: number, tileY: number) {
    const size = GAME_CONFIG.tileSize + GAME_CONFIG.tileGap;
    this.x = tileX * size;
    this.y = tileY * size;
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const worldX = (screenX - cx) / this.zoom + this.x;
    const worldY = (screenY - cy) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const screenX = (worldX - this.x) * this.zoom + cx;
    const screenY = (worldY - this.y) * this.zoom + cy;
    return { x: screenX, y: screenY };
  }

  public worldToTile(worldX: number, worldY: number): { tileX: number; tileY: number } {
    const step = GAME_CONFIG.tileSize + GAME_CONFIG.tileGap;
    const tileX = Math.floor((worldX + GAME_CONFIG.tileSize / 2) / step);
    const tileY = Math.floor((worldY + GAME_CONFIG.tileSize / 2) / step);
    return { tileX, tileY };
  }

  public getVisibleTileBounds(): { minTileX: number; minTileY: number; maxTileX: number; maxTileY: number } {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.viewportWidth, this.viewportHeight);

    const step = GAME_CONFIG.tileSize + GAME_CONFIG.tileGap;
    const margin = 2; // Extra tile margin for culling

    const minTileX = Math.floor(topLeft.x / step) - margin;
    const minTileY = Math.floor(topLeft.y / step) - margin;
    const maxTileX = Math.ceil(bottomRight.x / step) + margin;
    const maxTileY = Math.ceil(bottomRight.y / step) + margin;

    return { minTileX, minTileY, maxTileX, maxTileY };
  }
}
