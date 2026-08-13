'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';
import { GameEngine } from '../game/engine';
import { MultiplayerManager, type MpActionType } from '../game/multiplayer';
import { SaveManager } from '../game/save';
import type { PixiGameRenderer } from '../render/pixiGame';
import { EventBanner } from './EventBanner';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { MultiplayerModal } from './MultiplayerModal';
import { RulesModal } from './RulesModal';
import { StartScreen } from './StartScreen';
import { StatsModal } from './StatsModal';

interface HoverDetail { x: number; y: number; title: string; lines: string[] }

function seedFromText(value: string): number {
  if (/^\d+$/.test(value)) return Number(value) >>> 0;
  let hash = 2166136261;
  for (const char of value.toUpperCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

const TUTORIAL = [
  ['Your Core', 'Protect the luminous cell at the center. A hostile capture ends the run.'],
  ['Reveal', 'Hover the frontier east of your colony, read the prediction, then click it.'],
  ['Attack', 'The Coral cell is exposed. Hover to read support and success chance, then attack.'],
  ['Build a square', 'One perimeter cell remains. Reveal the highlighted frontier to close the 3×3.'],
  ['Repaint', 'Press Repaint below, then take the Coral cell with certainty.'],
  ['Read the intent', 'A Coral source now threatens your Core. Capture the source before its tendril resolves.'],
  ['The colony is yours', 'Reveal. Attack. Build squares. Read intents. Protect the Core.'],
] as const;

export function Game() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [mpStatus, setMpStatus] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverDetail | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const rendererRef = useRef<PixiGameRenderer | null>(null);
  const mpRef = useRef<MultiplayerManager | null>(null);
  const tutorialStepRef = useRef<number | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => setHasSave(SaveManager.hasSave()), []);
  useEffect(() => {
    const handler = (event: Event) => setHover((event as CustomEvent<HoverDetail | null>).detail);
    window.addEventListener('mycelium:hover', handler);
    return () => window.removeEventListener('mycelium:hover', handler);
  }, []);

  const setTutorial = (step: number | null) => {
    tutorialStepRef.current = step;
    setTutorialStep(step);
  };

  const advanceTutorial = useCallback((game: GameEngine) => {
    const step = tutorialStepRef.current;
    if (step === null || !game.lastAction) return;
    const action = game.lastAction;
    game.lastAction = null;
    if (step === 1 && action === 'reveal') {
      game.tutorialTarget = '2:1';
      setTutorial(2);
      game.refresh();
    } else if (step === 2 && action === 'attack') {
      for (const [x, y] of [[2,-1],[3,-1],[4,-1],[4,1],[3,1],[2,1]] as Array<[number, number]>) {
        const cell = game.world.getCell(x, y);
        cell.currentSpeciesId = game.playerSpecies;
        cell.claimed = true;
        cell.revealed = true;
      }
      const target = game.world.getCell(4, 0);
      target.naturalSpeciesId = game.playerSpecies;
      target.currentSpeciesId = game.playerSpecies;
      target.claimed = false;
      target.revealed = false;
      const interior = game.world.getCell(3, 0);
      interior.claimed = false;
      interior.revealed = false;
      game.tutorialTarget = '4:0';
      setTutorial(3);
      game.refresh();
    } else if (step === 3 && action === 'reveal') {
      const enemy = game.world.getCell(5, 0);
      enemy.currentSpeciesId = 'coral';
      enemy.naturalSpeciesId = 'coral';
      enemy.claimed = true;
      enemy.revealed = true;
      enemy.reinforcement = 2;
      game.tutorialTarget = '5:0';
      setTutorial(4);
      game.refresh();
    } else if (step === 4 && action === 'repaint') {
      const source = game.world.getCell(0, -1);
      source.currentSpeciesId = 'coral';
      source.claimed = true;
      source.revealed = true;
      source.reinforcement = 1;
      game.tutorialTarget = '0:-1';
      game.generateUpcomingIntents();
      setTutorial(5);
      game.refresh();
    } else if (step === 5 && action === 'attack') {
      game.tutorialTarget = null;
      setTutorial(6);
      game.refresh();
    }
  }, []);

  useEffect(() => {
    if (!engine) return;
    const unsubscribe = engine.subscribe(() => {
      forceUpdate((value) => value + 1);
      advanceTutorial(engine);
    });
    const keys = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') engine.toggleRepaintMode();
    };
    window.addEventListener('keydown', keys);
    return () => { unsubscribe(); window.removeEventListener('keydown', keys); };
  }, [engine, advanceTutorial]);

  const startGame = useCallback((species: SpeciesId, seed?: number) => {
    SaveManager.clearSave();
    const challenge = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('seed') : null;
    const next = new GameEngine(species, seed ?? (challenge ? seedFromText(challenge) : undefined));
    setTutorial(null);
    setEngine(next);
    setIsPlaying(true);
    setShowMultiplayer(false);
  }, []);

  const continueGame = useCallback(() => {
    const save = SaveManager.load();
    if (!save) return;
    setEngine(GameEngine.loadFromSave(save));
    setIsPlaying(true);
  }, []);

  const startDaily = useCallback((species: SpeciesId) => {
    const date = new Date().toISOString().slice(0, 10);
    SaveManager.clearSave();
    const next = new GameEngine(species, seedFromText(`MYCELIUM:${date}`));
    next.dailyKey = date;
    setTutorial(null);
    setEngine(next);
    setIsPlaying(true);
  }, []);

  const startTutorial = useCallback(() => {
    const game = new GameEngine('cyan', seedFromText('MYCELIUM:TUTORIAL'));
    game.tutorialMode = true;
    const reveal = game.world.getCell(2, 0);
    reveal.naturalSpeciesId = 'cyan';
    reveal.currentSpeciesId = 'cyan';
    const enemy = game.world.getCell(2, 1);
    enemy.naturalSpeciesId = 'coral';
    enemy.currentSpeciesId = 'coral';
    enemy.claimed = true;
    enemy.revealed = true;
    game.tutorialTarget = null;
    setTutorial(0);
    setEngine(game);
    setIsPlaying(true);
  }, []);

  const connectMultiplayer = useCallback((host: boolean, code: string, species: SpeciesId) => {
    const manager = new MultiplayerManager();
    mpRef.current = manager;
    manager.subscribe((event) => {
      if ((event === 'connected' || event === 'sync') && manager.engine) {
        setEngine(manager.engine);
        setIsPlaying(true);
        setShowMultiplayer(false);
        setMpStatus(host ? 'Host · connected' : 'Guest · connected');
      }
      if (event === 'disconnected') setMpStatus('Opponent disconnected');
      if (event === 'error') setMpStatus('Connection failed · retry with a new room');
    });
    if (host) manager.hostRoom(code, species); else manager.joinRoom(code, species);
  }, []);

  const exitToMenu = () => {
    mpRef.current?.leave();
    mpRef.current = null;
    setEngine(null);
    setIsPlaying(false);
    setTutorial(null);
    setMpStatus(null);
    setHasSave(SaveManager.hasSave());
  };

  const performOnlineAction = useCallback((x: number, y: number, type: MpActionType) => {
    if (mpRef.current) return mpRef.current.performAction(x, y, type);
    return false;
  }, []);

  if (!isPlaying || !engine) {
    return <>
      <StartScreen hasSave={hasSave} onStartNewGame={startGame} onContinueGame={continueGame} onOpenMultiplayer={() => setShowMultiplayer(true)} onOpenRules={() => setShowRules(true)} onStartTutorial={startTutorial} onStartDaily={startDaily} />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showMultiplayer && <MultiplayerModal onHost={(code, species) => connectMultiplayer(true, code, species)} onJoin={(code, species) => connectMultiplayer(false, code, species)} onClose={() => setShowMultiplayer(false)} />}
    </>;
  }

  const result = `MYCELIUM\nTurn ${engine.turn}\nTerritory ${engine.stats.playerTerritory}\nLargest Square ${engine.stats.largestSquareSize || '—'}\nCombo ×${engine.stats.maxCombo}\nSeed ${engine.seed.toString(36).toUpperCase()}`;
  const challengeLink = `${window.location.origin}${window.location.pathname}?seed=${engine.seed.toString(36).toUpperCase()}`;
  const tooltipStyle = hover ? { left: Math.min(window.innerWidth - 250, hover.x + 16), top: Math.min(window.innerHeight - 140, hover.y + 16) } : undefined;

  return <main className="game-root grain">
    <GameCanvas engine={engine} onRendererReady={(renderer) => { rendererRef.current = renderer; }} onOnlineAction={mpRef.current ? performOnlineAction : undefined} />
    {!engine.gameOver && !engine.gameWon && <HUD engine={engine} onOpenRules={() => setShowRules(true)} onOpenStats={() => setShowStats(true)} onCenterCore={() => rendererRef.current?.camera.centerOnTile(engine.coreX, engine.coreY)} onExit={exitToMenu} />}
    {mpStatus && <div className="event-warning" style={{ top: 88 }}>{mpStatus}</div>}
    {hover && <div className="cell-tooltip" style={tooltipStyle}><strong>{hover.title}</strong>{hover.lines.map((line) => <span key={line}>{line}</span>)}</div>}
    <EventBanner event={engine.lastEvent} />
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {showStats && <StatsModal stats={engine.stats} seed={engine.seed} onClose={() => setShowStats(false)} />}
    {tutorialStep !== null && !engine.gameOver && !engine.gameWon && <aside className="tutorial-card"><small>Lesson {tutorialStep + 1} / {TUTORIAL.length}</small><h3>{TUTORIAL[tutorialStep][0]}</h3><p>{TUTORIAL[tutorialStep][1]}</p>{tutorialStep === 0 && <button className="solid-button" onClick={() => { engine.tutorialTarget = '2:0'; setTutorial(1); engine.refresh(); }}>Begin</button>}{tutorialStep === 6 && <button className="solid-button" onClick={() => { engine.tutorialMode = false; exitToMenu(); }}>Finish</button>}</aside>}
    {engine.gameWon && <div className="modal-backdrop"><section className="modal run-end"><h2>Opponent Core captured.</h2><p>The substrate belongs to your colony.</p><div className="stats-line"><div className="stat"><small>Turns</small><b>{engine.turn}</b></div><div className="stat"><small>Territory</small><b>{engine.stats.playerTerritory}</b></div></div><div className="button-row"><button className="solid-button" onClick={exitToMenu}>Main menu</button></div></section></div>}
    {engine.gameOver && <div className="modal-backdrop"><section className="modal run-end"><h2>The Core has fallen.</h2><p>The colony ends, but the same substrate can be challenged again.</p><div className="stats-line"><div className="stat"><small>Turns</small><b>{engine.turn}</b></div><div className="stat"><small>Peak territory</small><b>{engine.stats.maxPlayerTerritory}</b></div><div className="stat"><small>Largest square</small><b>{engine.stats.largestSquareSize ? `${engine.stats.largestSquareSize}×${engine.stats.largestSquareSize}` : '—'}</b></div><div className="stat"><small>Longest chain</small><b>×{engine.stats.maxCombo}</b></div></div><div className="button-row"><button className="solid-button" onClick={exitToMenu}>New world</button><button className="quiet-button" onClick={() => { copyText(result); setCopied('Result copied'); }}>Copy result</button><button className="quiet-button" onClick={() => { copyText(challengeLink); setCopied('Link copied'); }}>Challenge link</button></div>{copied && <p>{copied}</p>}</section></div>}
  </main>;
}
