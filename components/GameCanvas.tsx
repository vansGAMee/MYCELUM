'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import type { MpActionType } from '../game/multiplayer';
import { PixiGameRenderer } from '../render/pixiGame';

interface GameCanvasProps {
  engine: GameEngine;
  onRendererReady?: (renderer: PixiGameRenderer) => void;
  onOnlineAction?: (x: number, y: number, type: MpActionType) => boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onRendererReady, onOnlineAction }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiGameRenderer | null>(null);
  const stableCallback = useRef(onRendererReady);
  stableCallback.current = onRendererReady;

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const renderer = new PixiGameRenderer(containerRef.current, engine, onOnlineAction);
    rendererRef.current = renderer;

    renderer.init().then(() => {
      if (cancelled) {
        renderer.destroy();
        return;
      }
      if (stableCallback.current) {
        stableCallback.current(renderer);
      }
    });

    return () => {
      cancelled = true;
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [engine, onOnlineAction]);

  return <div ref={containerRef} className="fixed inset-0 w-full h-full" style={{ backgroundColor: '#050507' }} />;
};
