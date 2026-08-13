'use client';

import React from 'react';
import { GAME_CONFIG } from '../game/config';
import { GameStats } from '../game/types';
import { SPECIES_LIST } from '../game/world';

interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  padding: 16,
  userSelect: 'none',
};

const panel: React.CSSProperties = {
  maxWidth: 448,
  width: '100%',
  backgroundColor: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24,
  padding: 24,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  paddingBottom: 16,
};

const heading: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  margin: 0,
};

const closeBtn: React.CSSProperties = {
  color: '#a3a3a3',
  fontSize: '0.75rem',
  padding: '6px 12px',
  borderRadius: 12,
  backgroundColor: '#171717',
  border: 'none',
  cursor: 'pointer',
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  fontSize: '0.75rem',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

const card: React.CSSProperties = {
  padding: 12,
  borderRadius: 16,
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const cardLabel: React.CSSProperties = {
  color: '#a3a3a3',
};

const cardValue = (color: string): React.CSSProperties => ({
  fontSize: '1.125rem',
  fontWeight: 700,
  color,
});

const distSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const distLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  color: '#a3a3a3',
  textTransform: 'uppercase',
};

const barTrack: React.CSSProperties = {
  height: 16,
  borderRadius: 12,
  backgroundColor: '#171717',
  overflow: 'hidden',
  display: 'flex',
};

export const StatsModal: React.FC<StatsModalProps> = ({ stats, onClose }) => {
  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={header}>
          <h2 style={heading}>COLONY STATISTICS</h2>
          <button onClick={onClose} style={closeBtn}>
            CLOSE
          </button>
        </div>

        <div style={grid}>
          <div style={card}>
            <span style={cardLabel}>TURNS SURVIVED</span>
            <div style={cardValue('#fff')}>{stats.turnCount}</div>
          </div>

          <div style={card}>
            <span style={cardLabel}>CURRENT TERRITORY</span>
            <div style={cardValue('#34d399')}>{stats.playerTerritory}</div>
          </div>

          <div style={card}>
            <span style={cardLabel}>PEAK TERRITORY</span>
            <div style={cardValue('#22d3ee')}>{stats.maxPlayerTerritory}</div>
          </div>

          <div style={card}>
            <span style={cardLabel}>SQUARES CAPTURED</span>
            <div style={cardValue('#c084fc')}>{stats.totalSquaresCaptured}</div>
          </div>

          <div style={card}>
            <span style={cardLabel}>LARGEST SQUARE</span>
            <div style={cardValue('#fbbf24')}>
              {stats.largestSquareSize > 0 ? `${stats.largestSquareSize}x${stats.largestSquareSize}` : '-'}
            </div>
          </div>

          <div style={card}>
            <span style={cardLabel}>MAX COMBO</span>
            <div style={cardValue('#f472b6')}>x{stats.maxCombo}</div>
          </div>
        </div>

        {/* Species Distribution Chart Bar */}
        <div style={distSection}>
          <div style={distLabel}>Species Distribution</div>
          <div style={barTrack}>
            {SPECIES_LIST.map((sp) => {
              const count = stats.speciesDistribution[sp] || 0;
              const total = Object.values(stats.speciesDistribution).reduce((a, b) => a + b, 0) || 1;
              const pct = (count / total) * 100;
              const spObj = GAME_CONFIG.colors.species[sp];

              return (
                <div
                  key={sp}
                  style={{ width: `${pct}%`, backgroundColor: spObj.cssHex }}
                  title={`${spObj.name}: ${count}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
