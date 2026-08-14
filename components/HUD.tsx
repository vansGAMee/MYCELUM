'use client';

import { useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';
import type { GameEngine } from '../game/engine';
import type { PlayerRole } from '../game/multiplayer';

export interface DuelHudState {
  role: PlayerRole;
  round: number;
  isMyTurn: boolean;
  pending: boolean;
  roomCode: string;
  opponentSpecies: SpeciesId;
  disconnected: boolean;
  bonusTurn: boolean;
}

interface HUDProps {
  engine: GameEngine;
  duel?: DuelHudState;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onCenterCore: () => void;
  onExit: () => void;
}

export function HUD({ engine, duel, onOpenRules, onOpenStats, onCenterCore, onExit }: HUDProps) {
  const [open, setOpen] = useState(false);
  const [, refreshModes] = useState(0);
  const turnLabel = duel?.disconnected ? 'СОПЕРНИК ОТКЛЮЧИЛСЯ' : duel?.pending ? 'ХОД ПОДТВЕРЖДАЕТСЯ' : duel?.bonusTurn && duel.isMyTurn ? 'БОНУСНЫЙ ХОД' : duel?.isMyTurn ? 'ВАШ ХОД' : 'СОПЕРНИК ДУМАЕТ';
  return <>
    {duel && <div className={`duel-turn ${duel.isMyTurn ? 'mine' : ''} ${duel.disconnected ? 'offline' : ''}`} aria-live="polite">
      <span>РАУНД {duel.round}</span><strong>{turnLabel}</strong><span>{duel.role === 'host' ? 'ХОЗЯИН' : 'ГОСТЬ'} · {GAME_CONFIG.colors.species[duel.opponentSpecies].name.toUpperCase()}</span>
    </div>}
    <div className={`hud ${duel ? 'hud-duel' : ''}`} aria-label="Состояние партии">
      <span>{duel ? 'ход' : 'цикл'} <b>{engine.turn}</b></span>
      <span>территория <b>{engine.stats.playerTerritory}</b></span>
      <span>перекраска <b>{engine.repaintCharges}/{GAME_CONFIG.maxRepaints}</b></span>
      {duel && engine.duelPickup && <span className="duel-pickup">бомба <b>{engine.duelPickup.x}:{engine.duelPickup.y}</b></span>}
      {duel && engine.duelBombCharges > 0 && <span className="duel-pickup ready">заряд <b>готов</b></span>}
      {!duel && <span className="event-count">событие <b>· {engine.getTurnsUntilEvent()}</b></span>}
      {engine.isCoreInDanger && <span className="danger">Ядро под угрозой</span>}
      <button className="hud-menu" aria-label="Открыть меню" onClick={() => setOpen((value) => !value)}>•••</button>
    </div>
    {open && <div className={`hud-menu-pop ${duel ? 'hud-menu-duel' : ''}`}>
      <button onClick={() => { onCenterCore(); setOpen(false); }}>К Ядру</button>
      <button onClick={() => { onOpenRules(); setOpen(false); }}>Правила</button>
      <button onClick={() => { onOpenStats(); setOpen(false); }}>Статистика</button>
      <button onClick={onExit}>{duel ? 'Покинуть дуэль' : 'Главное меню'}</button>
    </div>}
    {!duel && engine.eventWarning && <div className="event-warning">{engine.eventWarning}</div>}
    <div className="turn-actions">
      <span className="action-hint">{duel && !duel.isMyTurn ? 'наблюдайте за соперником · готовьте ответ' : engine.isDuelBombMode ? 'выберите укреплённую клетку квадрата · Ядро защищено' : 'фронтир: открыть · враг: атаковать · замыкайте квадраты'}</span>
      {duel && <button className={`repaint-button bomb-button ${engine.isDuelBombMode ? 'active' : ''}`} disabled={engine.duelBombCharges === 0 || !duel.isMyTurn} onClick={() => { engine.toggleDuelBombMode(); refreshModes((value) => value + 1); }}>{engine.isDuelBombMode ? 'Бомба активна' : `Споровая бомба · ${engine.duelBombCharges}`}</button>}
      <button className={`repaint-button ${engine.isRepaintMode ? 'active' : ''}`} disabled={engine.repaintCharges === 0 || !!duel && !duel.isMyTurn} onClick={() => { engine.toggleRepaintMode(); refreshModes((value) => value + 1); }}>{engine.isRepaintMode ? 'Перекраска активна' : `Перекраска · ${engine.repaintCharges}`}</button>
    </div>
  </>;
}
