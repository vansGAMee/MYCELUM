'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SpeciesId } from '../game/config';
import { GameEngine } from '../game/engine';
import { MultiplayerManager } from '../game/multiplayer';
import { SaveManager } from '../game/save';
import { PixiGameRenderer } from '../render/pixiGame';
import { EventBanner } from './EventBanner';
import { EventHistory } from './EventHistory';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { MultiplayerModal } from './MultiplayerModal';
import { RulesModal } from './RulesModal';
import { StartScreen } from './StartScreen';
import { StatsModal } from './StatsModal';
import { TutorialModal } from './TutorialModal';

export const Game: React.FC = () => {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMpModal, setShowMpModal] = useState(false);
  const [mpStatus, setMpStatus] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(SaveManager.hasSave());
  }, []);

  const mpRef = useRef<MultiplayerManager | null>(null);
  const rendererRef = useRef<PixiGameRenderer | null>(null);
  const [, forceUpdate] = useState(0);

  const handleStartNewGame = useCallback((species: SpeciesId) => {
    SaveManager.clearSave();
    const newEngine = new GameEngine(species);
    setEngine(newEngine);
    setIsPlaying(true);
    setShowMpModal(false);
  }, []);

  const handleContinueGame = useCallback(() => {
    const saveData = SaveManager.load();
    if (saveData) {
      const loadedEngine = GameEngine.loadFromSave(saveData);
      setEngine(loadedEngine);
      setIsPlaying(true);
      setShowMpModal(false);
    }
  }, []);

  const handleHostMp = useCallback((roomCode: string, species: SpeciesId) => {
    const mp = new MultiplayerManager();
    mpRef.current = mp;

    mp.subscribe((evt) => {
      if (evt === 'connected') {
        if (mp.engine) {
          setEngine(mp.engine);
          setIsPlaying(true);
          setShowMpModal(false);
          setMpStatus('Connected (Host)');
        }
      } else if (evt === 'disconnected') {
        setMpStatus('Opponent disconnected');
      }
    });

    mp.hostRoom(roomCode, species);
  }, []);

  const handleJoinMp = useCallback((roomCode: string, species: SpeciesId) => {
    const mp = new MultiplayerManager();
    mpRef.current = mp;

    mp.subscribe((evt) => {
      if (evt === 'connected' || evt === 'sync') {
        if (mp.engine) {
          setEngine(mp.engine);
          setIsPlaying(true);
          setShowMpModal(false);
          setMpStatus('Connected (Guest)');
        }
      } else if (evt === 'disconnected') {
        setMpStatus('Opponent disconnected');
      }
    });

    mp.joinRoom(roomCode, species);
  }, []);

  useEffect(() => {
    if (!engine) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        engine.toggleRepaintMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const unsub = engine.subscribe(() => forceUpdate((n) => n + 1));
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsub();
    };
  }, [engine]);

  const handleRendererReady = useCallback((r: PixiGameRenderer) => {
    rendererRef.current = r;
  }, []);

  const handleCenterCamera = useCallback(() => {
    if (rendererRef.current) rendererRef.current.camera.centerOnTile(0, 0);
  }, []);

  if (!isPlaying || !engine) {
    return (
      <>
        <StartScreen
          onStartNewGame={handleStartNewGame}
          onContinueGame={handleContinueGame}
          onOpenMultiplayer={() => setShowMpModal(true)}
          onOpenRules={() => setShowRules(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          hasSave={hasSave}
        />
        {showMpModal && (
          <MultiplayerModal
            onHost={handleHostMp}
            onJoin={handleJoinMp}
            onClose={() => setShowMpModal(false)}
          />
        )}
        {showRules && (
          <RulesModal onClose={() => setShowRules(false)} />
        )}
        {showTutorial && (
          <TutorialModal onClose={() => setShowTutorial(false)} />
        )}
      </>
    );
  }

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#030305' }}>
      <GameCanvas engine={engine} onRendererReady={handleRendererReady} />

      {!engine.gameOver && !engine.gameWon && (
        <HUD
          engine={engine}
          onToggleHistory={() => setShowHistory((p) => !p)}
          onOpenRules={() => setShowRules(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          showHistory={showHistory}
        />
      )}

      {mpStatus && (
        <div style={{
          position: 'fixed', top: 12, right: 12, zIndex: 40, padding: '4px 10px',
          borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.65rem', fontFamily: 'monospace', color: '#22d3ee',
        }}>
          {mpStatus}
        </div>
      )}

      <EventBanner event={engine.lastEvent} />

      {showHistory && !engine.gameOver && !engine.gameWon && (
        <EventHistory logs={engine.eventLogs} onClose={() => setShowHistory(false)} />
      )}

      {showStats && !engine.gameOver && !engine.gameWon && (
        <StatsModal stats={engine.stats} onClose={() => setShowStats(false)} />
      )}

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}

      {/* Victory Screen */}
      {engine.gameWon && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            maxWidth: 400, width: '100%', backgroundColor: '#0a0a0c',
            border: '1px solid rgba(52,211,153,0.3)', borderRadius: '1.5rem',
            padding: '2.5rem 2rem', textAlign: 'center', margin: 'auto',
          }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', letterSpacing: '0.05em', margin: 0 }}>
              COLONY DOMINANCE! (ПОБЕДА)
            </h2>
            <p style={{
              fontSize: '0.75rem', color: '#a3a3a3', fontFamily: 'ui-monospace, monospace',
              marginTop: '1rem', lineHeight: 1.6,
            }}>
              Ваша колония мицелия захватила господство в этом мире!
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem',
              marginTop: '1.5rem', fontSize: '0.65rem',
              fontFamily: 'ui-monospace, monospace', color: '#a3a3a3',
            }}>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>TURNS</div>
                <div style={{ color: '#e5e5e5', fontWeight: 700, fontSize: '1rem' }}>{engine.stats.turnCount}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>TERRITORY</div>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>{engine.stats.playerTerritory}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>LARGEST SQUARE</div>
                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem' }}>
                  {engine.stats.largestSquareSize > 0 ? `${engine.stats.largestSquareSize}×${engine.stats.largestSquareSize}` : '-'}
                </div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>MAX COMBO</div>
                <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '1rem' }}>×{engine.stats.maxCombo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => { setIsPlaying(false); setEngine(null); mpRef.current?.leave(); }}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '0.8rem',
                  backgroundColor: '#34d399', color: '#000', fontWeight: 800,
                  fontSize: '0.75rem', letterSpacing: '0.05em', border: 'none', cursor: 'pointer',
                }}
              >NEW WORLD</button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {engine.gameOver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{
            maxWidth: 380, width: '100%', backgroundColor: '#0a0a0c',
            border: '1px solid rgba(255,60,60,0.25)', borderRadius: '1.5rem',
            padding: '2.5rem 2rem', textAlign: 'center', margin: 'auto',
          }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ff3333', letterSpacing: '0.05em', margin: 0 }}>
              YOUR CORE HAS FALLEN (ПОРАЖЕНИЕ)
            </h2>
            <p style={{
              fontSize: '0.7rem', color: '#737373', fontFamily: 'ui-monospace, monospace',
              marginTop: '1rem', lineHeight: 1.6,
            }}>
              Вражеский мицелий уничтожил все щиты вашего Ядра!
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem',
              marginTop: '1.5rem', fontSize: '0.65rem',
              fontFamily: 'ui-monospace, monospace', color: '#a3a3a3',
            }}>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>TURNS</div>
                <div style={{ color: '#e5e5e5', fontWeight: 700, fontSize: '1rem' }}>{engine.stats.turnCount}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>PEAK TERRITORY</div>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>{engine.stats.maxPlayerTerritory}</div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>LARGEST SQUARE</div>
                <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem' }}>
                  {engine.stats.largestSquareSize > 0 ? `${engine.stats.largestSquareSize}×${engine.stats.largestSquareSize}` : '-'}
                </div>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '0.6rem', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ color: '#525252' }}>MAX COMBO</div>
                <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '1rem' }}>×{engine.stats.maxCombo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => { setIsPlaying(false); setEngine(null); mpRef.current?.leave(); }}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '0.8rem',
                  backgroundColor: '#fff', color: '#000', fontWeight: 700,
                  fontSize: '0.7rem', letterSpacing: '0.05em', border: 'none', cursor: 'pointer',
                }}
              >NEW WORLD</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
