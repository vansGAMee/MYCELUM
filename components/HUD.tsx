'use client';

import React from 'react';
import { GAME_CONFIG } from '../game/config';
import { GameEngine } from '../game/engine';

interface HUDProps {
  engine: GameEngine;
  onOpenRules: () => void;
  onOpenTutorial: () => void;
  onToggleHistory: () => void;
  showHistory: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenRules,
  onOpenTutorial,
  onToggleHistory,
  showHistory,
}) => {
  const sp = GAME_CONFIG.colors.species[engine.playerSpecies];
  const era = engine.getCurrentEra();
  const nextEvent = GAME_CONFIG.eventInterval - (engine.turn % GAME_CONFIG.eventInterval);

  const fontMono = { fontFamily: "'JetBrains Mono', monospace" };
  const fontSans = { fontFamily: "'Outfit', sans-serif" };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '12px 16px', zIndex: 20, pointerEvents: 'none', userSelect: 'none',
    }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        {/* Left: Core + Stats Panel */}
        <div className="tactical-glass" style={{
          display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto',
          padding: '12px 16px', borderRadius: 16, maxWidth: 460, width: '100%',
        }}>
          {/* Core Status Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: engine.isCoreInDanger ? '#ff4444' : sp.cssHex,
                boxShadow: `0 0 10px ${engine.isCoreInDanger ? '#ff4444' : sp.cssHex}`,
              }} />
              <span style={{ ...fontSans, fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.05em', color: '#fff' }}>
                CORE ◉ {engine.isCoreInDanger ? <span style={{ color: '#ff4444', animation: 'pulse 1s infinite' }}>⚠️ IN DANGER</span> : <span style={{ color: sp.cssHex }}>ONLINE</span>}
              </span>
            </div>
            <span style={{ ...fontMono, fontSize: '0.65rem', color: '#71717a', fontWeight: 600 }}>{era.name}</span>
          </div>

          {/* Metrics Row */}
          <div style={{ display: 'flex', gap: 16, ...fontMono, fontSize: '0.7rem', color: '#a1a1aa' }}>
            <div>
              <span style={{ color: '#71717a', fontSize: '0.6rem', display: 'block' }}>TURN</span>
              <b style={{ color: '#fff', fontSize: '0.85rem' }}>{engine.turn}</b>
            </div>
            <div>
              <span style={{ color: '#71717a', fontSize: '0.6rem', display: 'block' }}>TERRITORY</span>
              <b style={{ color: '#34d399', fontSize: '0.85rem' }}>{engine.stats.playerTerritory}</b>
            </div>
            <div>
              <span style={{ color: '#71717a', fontSize: '0.6rem', display: 'block' }}>REPAINT</span>
              <b style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>{engine.repaintCharges}/{GAME_CONFIG.maxRepaints}</b>
            </div>
            {engine.currentCombo > 1 && (
              <div>
                <span style={{ color: '#71717a', fontSize: '0.6rem', display: 'block' }}>CASCADE</span>
                <b style={{ color: '#fbbf24', fontSize: '0.85rem' }}>×{engine.currentCombo}</b>
              </div>
            )}
          </div>

          {/* Core Hint */}
          <div style={{ ...fontMono, fontSize: '0.6rem', color: '#71717a', letterSpacing: '0.025em' }}>
            EXPAND · BUILD SQUARES · READ INTENTS · PROTECT CORE ◉
          </div>

          {engine.enemyCoreX !== null && engine.enemyCoreY !== null && (
            <div style={{ ...fontMono, fontSize: '0.65rem', color: '#ff4444', fontWeight: 800 }}>
              ☠ ENEMY CORE: X={engine.enemyCoreX}, Y={engine.enemyCoreY}
            </div>
          )}
        </div>

        {/* Right Top Controls */}
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <div className="tactical-glass" style={{
            padding: '8px 12px', borderRadius: 12, ...fontMono, fontSize: '0.65rem', color: '#a1a1aa',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>EVENT IN</span>
            <b style={{ color: '#22d3ee', fontSize: '0.85rem' }}>{nextEvent === 10 ? 0 : nextEvent}</b>
          </div>

          <button onClick={onOpenTutorial} className="tactical-btn" style={{
            padding: '8px 14px', borderRadius: 12, fontSize: '0.7rem',
            backgroundColor: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
            color: '#34d399', cursor: 'pointer',
          }}>
            🎓 TUTORIAL
          </button>

          <button onClick={onOpenRules} className="tactical-btn" style={{
            padding: '8px 14px', borderRadius: 12, fontSize: '0.7rem',
            backgroundColor: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)',
            color: '#22d3ee', cursor: 'pointer',
          }}>
            RULES
          </button>

          <button onClick={onToggleHistory} className="tactical-btn" style={{
            padding: '8px 14px', borderRadius: 12, fontSize: '0.7rem',
            backgroundColor: showHistory ? 'rgba(255,255,255,0.15)' : 'rgba(10,10,16,0.82)',
            border: '1px solid rgba(255,255,255,0.12)', color: showHistory ? '#fff' : '#a1a1aa',
            cursor: 'pointer',
          }}>
            LOGS
          </button>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => engine.toggleRepaintMode()}
            disabled={engine.repaintCharges <= 0}
            className="tactical-btn"
            style={{
              padding: '10px 18px', borderRadius: 14, fontSize: '0.75rem',
              backgroundColor: engine.isRepaintMode ? '#34d399' : 'rgba(10,10,16,0.9)',
              color: engine.isRepaintMode ? '#000' : engine.repaintCharges > 0 ? '#34d399' : '#525252',
              border: `1px solid ${engine.isRepaintMode ? '#34d399' : 'rgba(52,211,153,0.3)'}`,
              cursor: engine.repaintCharges > 0 ? 'pointer' : 'not-allowed',
              backdropFilter: 'blur(20px)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
          >
            {engine.isRepaintMode ? '● REPAINT MODE ACTIVE [R]' : `REPAINT [R] (${engine.repaintCharges}/${GAME_CONFIG.maxRepaints})`}
          </button>
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => {
              const evt = new CustomEvent('centerCore');
              window.dispatchEvent(evt);
            }}
            className="tactical-btn"
            style={{
              padding: '10px 16px', borderRadius: 12, fontSize: '0.7rem',
              backgroundColor: 'rgba(10,10,16,0.85)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#a1a1aa', cursor: 'pointer', backdropFilter: 'blur(20px)',
            }}
          >
            CENTER ◉
          </button>
        </div>
      </div>
    </div>
  );
};
