'use client';

import type { GameStats } from '../game/types';

export function StatsModal({ stats, seed, onClose }: { stats: GameStats; seed: number; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stats-title"><section className="modal"><header className="modal-head"><h2 id="stats-title">Текущая колония</h2><button className="icon-button" onClick={onClose}>Закрыть</button></header><div className="stats-line"><div className="stat"><small>Ход</small><b>{stats.turnCount}</b></div><div className="stat"><small>Территория</small><b>{stats.playerTerritory}</b></div><div className="stat"><small>Рекорд территории</small><b>{stats.maxPlayerTerritory}</b></div><div className="stat"><small>Захвачено врагов</small><b>{stats.enemiesCaptured}</b></div><div className="stat"><small>Крупнейший квадрат</small><b>{stats.largestSquareSize || '—'}</b></div><div className="stat"><small>Лучшая цепочка</small><b>×{stats.maxCombo}</b></div><div className="stat"><small>Пережито событий</small><b>{stats.eventsSurvived}</b></div><div className="stat"><small>Код мира</small><b>{seed.toString(36).toUpperCase()}</b></div></div></section></div>;
}
