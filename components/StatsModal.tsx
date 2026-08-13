'use client';

import type { GameStats } from '../game/types';

export function StatsModal({ stats, seed, onClose }: { stats: GameStats; seed: number; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><header className="modal-head"><h2>Run</h2><button className="icon-button" onClick={onClose}>Close</button></header><div className="stats-line"><div className="stat"><small>Turn</small><b>{stats.turnCount}</b></div><div className="stat"><small>Territory</small><b>{stats.playerTerritory}</b></div><div className="stat"><small>Peak</small><b>{stats.maxPlayerTerritory}</b></div><div className="stat"><small>Enemies captured</small><b>{stats.enemiesCaptured}</b></div><div className="stat"><small>Largest square</small><b>{stats.largestSquareSize || '—'}</b></div><div className="stat"><small>Longest chain</small><b>×{stats.maxCombo}</b></div><div className="stat"><small>Events survived</small><b>{stats.eventsSurvived}</b></div><div className="stat"><small>Seed</small><b>{seed.toString(36).toUpperCase()}</b></div></div></section></div>;
}
