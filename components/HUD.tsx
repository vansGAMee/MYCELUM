'use client';

import { useState } from 'react';
import { GAME_CONFIG } from '../game/config';
import type { GameEngine } from '../game/engine';

interface HUDProps {
  engine: GameEngine;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onCenterCore: () => void;
  onExit: () => void;
}

export function HUD({ engine, onOpenRules, onOpenStats, onCenterCore, onExit }: HUDProps) {
  const [open, setOpen] = useState(false);
  const charges = '●'.repeat(engine.repaintCharges) + '○'.repeat(GAME_CONFIG.maxRepaints - engine.repaintCharges);
  return <>
    <div className="hud" aria-label="Run status">
      <span>turn <b>{engine.turn}</b></span>
      <span>territory <b>{engine.stats.playerTerritory}</b></span>
      <span>repaint <b>{charges}</b></span>
      <span className="event-count">event <b>· {engine.getTurnsUntilEvent()}</b></span>
      {engine.isCoreInDanger && <span className="danger">Core in danger</span>}
      <button className="hud-menu" aria-label="Open menu" onClick={() => setOpen((value) => !value)}>⋯</button>
    </div>
    {open && <div className="hud-menu-pop">
      <button onClick={() => { onCenterCore(); setOpen(false); }}>Center Core</button>
      <button onClick={() => { onOpenRules(); setOpen(false); }}>Rules</button>
      <button onClick={() => { onOpenStats(); setOpen(false); }}>Run stats</button>
      <button onClick={onExit}>Main menu</button>
    </div>}
    {engine.eventWarning && <div className="event-warning">{engine.eventWarning}</div>}
    <div className="turn-actions">
      <span className="action-hint">click frontier to reveal · click hostile to attack</span>
      <button className={`repaint-button ${engine.isRepaintMode ? 'active' : ''}`} disabled={engine.repaintCharges === 0} onClick={() => engine.toggleRepaintMode()}>{engine.isRepaintMode ? 'Repaint active' : `Repaint · ${engine.repaintCharges}`}</button>
    </div>
  </>;
}
