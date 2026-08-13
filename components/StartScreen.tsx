'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GAME_CONFIG, SpeciesId } from '../game/config';
import { SPECIES_LIST } from '../game/world';

interface StartScreenProps {
  onStartNewGame: (species: SpeciesId) => void;
  onContinueGame: () => void;
  onOpenRules: () => void;
  onOpenTutorial: () => void;
  onOpenMultiplayer: () => void;
  hasSave: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartNewGame,
  onContinueGame,
  onOpenRules,
  onOpenTutorial,
  onOpenMultiplayer,
  hasSave,
}) => {
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesId>('cyan');

  const fontSans = { fontFamily: "'Outfit', sans-serif" };
  const fontMono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#030305', backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(34, 211, 238, 0.08) 0%, transparent 60%)',
      padding: 16, userSelect: 'none',
    }}>
      <div className="tactical-glass" style={{
        maxWidth: 520, width: '100%', borderRadius: 28, padding: 36,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center',
      }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            padding: '4px 12px', borderRadius: 20, backgroundColor: 'rgba(34, 211, 238, 0.1)',
            border: '1px solid rgba(34, 211, 238, 0.25)', ...fontMono, fontSize: '0.65rem',
            color: '#22d3ee', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            MICROBIAL CONQUEST & CORE DEFENSE
          </div>
          <h1 style={{
            fontSize: '3.2rem', fontWeight: 900, margin: 0, ...fontSans, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 0%, #22d3ee 50%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            MYCELIUM
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: 0, lineHeight: 1.5, ...fontSans }}>
            Tactical territory expansion and Core defense strategy.
          </p>
        </div>

        {/* Species Selector */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: '0.7rem', ...fontMono, color: '#71717a', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'left' }}>
            SELECT PRIMARY SPECIES
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {SPECIES_LIST.map((spKey) => {
              const sp = GAME_CONFIG.colors.species[spKey];
              const isSelected = selectedSpecies === spKey;
              return (
                <button
                  key={spKey}
                  onClick={() => setSelectedSpecies(spKey)}
                  className="tactical-btn"
                  style={{
                    height: 52, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4,
                    border: isSelected ? `2px solid ${sp.cssHex}` : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: isSelected ? `${sp.cssHex}22` : 'rgba(255,255,255,0.02)',
                    opacity: isSelected ? 1 : 0.6, cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: sp.cssHex, marginBottom: 4, boxShadow: isSelected ? `0 0 10px ${sp.cssHex}` : 'none' }} />
                  <span style={{ fontSize: 9, ...fontMono, color: '#f4f4f5', textTransform: 'capitalize' }}>{spKey}</span>
                </button>
              );
            })}
          </div>

          {/* Species Passive Info */}
          {(() => {
            const activeSp = GAME_CONFIG.colors.species[selectedSpecies];
            return (
              <div style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeSp.cssHex}33`, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: activeSp.cssHex, ...fontMono }}>
                  {activeSp.name} — {activeSp.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#a1a1aa', lineHeight: 1.45, ...fontSans }}>
                  <b style={{ color: '#fff' }}>{activeSp.passiveName}</b>: {activeSp.passiveDesc}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Primary Action Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hasSave && (
            <button onClick={onContinueGame} className="tactical-btn" style={{
              width: '100%', padding: '14px 20px', borderRadius: 14, backgroundColor: '#ffffff', color: '#000000',
              fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
            }}>
              CONTINUE GAME
            </button>
          )}

          <button onClick={() => onStartNewGame(selectedSpecies)} className="tactical-btn" style={{
            width: '100%', padding: '14px 20px', borderRadius: 14, fontWeight: 800, fontSize: '0.85rem',
            cursor: 'pointer', backgroundColor: hasSave ? 'rgba(255,255,255,0.06)' : '#ffffff',
            color: hasSave ? '#f4f4f5' : '#000000', border: hasSave ? '1px solid rgba(255,255,255,0.15)' : 'none',
          }}>
            NEW WORLD
          </button>

          <button onClick={onOpenTutorial} className="tactical-btn" style={{
            width: '100%', padding: '12px 20px', borderRadius: 14, fontWeight: 800, fontSize: '0.8rem',
            cursor: 'pointer', backgroundColor: 'rgba(52,211,153,0.12)',
            color: '#34d399', border: '1px solid rgba(52,211,153,0.3)',
          }}>
            🎓 TUTORIAL / ОБУЧЕНИЕ
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button onClick={onOpenRules} className="tactical-btn" style={{
              padding: '10px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.7rem',
              cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.04)', color: '#f4f4f5',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              ПРАВИЛА
            </button>

            <button onClick={onOpenMultiplayer} className="tactical-btn" style={{
              padding: '10px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.7rem',
              cursor: 'pointer', backgroundColor: 'rgba(34,211,238,0.12)', color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)',
            }}>
              P2P 1V1
            </button>

            <Link href="/wiki" className="tactical-btn" style={{
              padding: '10px 8px', borderRadius: 12, fontWeight: 700, fontSize: '0.7rem',
              cursor: 'pointer', backgroundColor: 'rgba(167,139,250,0.12)', color: '#a78bfa',
              border: '1px solid rgba(167,139,250,0.3)', textDecoration: 'none', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              WIKI / ЛОР
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
