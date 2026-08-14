'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';
import { GameEngine } from '../game/engine';
import { MultiplayerManager, type MpActionType } from '../game/multiplayer';
import { SaveManager } from '../game/save';
import type { PixiGameRenderer } from '../render/pixiGame';
import { EventBanner } from './EventBanner';
import { GameCanvas } from './GameCanvas';
import { HUD, type DuelHudState } from './HUD';
import { MultiplayerModal, type MultiplayerLobbyState } from './MultiplayerModal';
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

function seedFromChallenge(value: string): number {
  return /^[0-9a-z]+$/i.test(value) ? Number.parseInt(value, 36) >>> 0 : seedFromText(value);
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
  ['Ваше Ядро', 'Защищайте светящуюся клетку в центре. Захват Ядра завершает партию.'],
  ['Разведка', 'Наведитесь на фронтир к востоку от колонии, прочтите прогноз и откройте клетку.'],
  ['Атака', 'Коралловая клетка раскрыта. Проверьте поддержку и шанс успеха, затем атакуйте.'],
  ['Замкните квадрат', 'На периметре осталась одна клетка. Откройте подсвеченный фронтир и завершите квадрат 3×3.'],
  ['Перекраска', 'Включите Перекраску и гарантированно захватите Коралловую клетку.'],
  ['Читайте намерение', 'Коралловый источник угрожает Ядру. Захватите источник до разрешения отростка.'],
  ['Колония ваша', 'Исследуйте. Атакуйте. Замыкайте квадраты. Читайте намерения. Берегите Ядро.'],
] as const;

export function Game() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [mpStatus, setMpStatus] = useState<string | null>(null);
  const [mpLobby, setMpLobby] = useState<MultiplayerLobbyState>({ phase: 'idle' });
  const [mpDisconnected, setMpDisconnected] = useState(false);
  const [hover, setHover] = useState<HoverDetail | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const [suppressLoadedEvent, setSuppressLoadedEvent] = useState(false);
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
      setSuppressLoadedEvent(false);
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
    const next = new GameEngine(species, seed ?? (challenge ? seedFromChallenge(challenge) : undefined));
    setSuppressLoadedEvent(false);
    setTutorial(null);
    setEngine(next);
    setIsPlaying(true);
    setShowMultiplayer(false);
  }, []);

  const continueGame = useCallback(() => {
    const save = SaveManager.load();
    if (!save) return;
    setSuppressLoadedEvent(true);
    setEngine(GameEngine.loadFromSave(save));
    setIsPlaying(true);
  }, []);

  const startDaily = useCallback((species: SpeciesId) => {
    const date = new Date().toISOString().slice(0, 10);
    SaveManager.clearSave();
    const next = new GameEngine(species, seedFromText(`MYCELIUM:${date}`));
    setSuppressLoadedEvent(false);
    next.dailyKey = date;
    setTutorial(null);
    setEngine(next);
    setIsPlaying(true);
  }, []);

  const startTutorial = useCallback(() => {
    const game = new GameEngine('cyan', seedFromText('MYCELIUM:TUTORIAL'));
    setSuppressLoadedEvent(false);
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
    mpRef.current?.leave();
    const manager = new MultiplayerManager();
    mpRef.current = manager;
    setMpDisconnected(false);
    setMpStatus(null);
    setMpLobby({ phase: 'waiting', role: host ? 'host' : 'guest', roomCode: code });
    manager.subscribe((event, data) => {
      if (event === 'waiting') setMpLobby({ phase: 'waiting', role: host ? 'host' : 'guest', roomCode: code });
      if ((event === 'connected' || event === 'sync') && manager.engine) {
        setEngine(manager.engine);
        setIsPlaying(true);
        setShowMultiplayer(false);
        setMpLobby({ phase: 'idle' });
        if (event === 'connected') {
          setMpStatus(manager.connectionNote ?? null);
          if (manager.connectionNote) window.setTimeout(() => setMpStatus(null), 5200);
        }
        forceUpdate((value) => value + 1);
      }
      if (event === 'rejected') forceUpdate((value) => value + 1);
      if (event === 'disconnected') { setMpDisconnected(true); setMpStatus('Соперник отключился · дуэль приостановлена'); }
      if (event === 'error') {
        const message = typeof data === 'string' ? data : 'Не удалось установить прямое соединение.';
        setMpLobby({ phase: 'error', role: host ? 'host' : 'guest', roomCode: code, message });
        setMpStatus(`Проблема соединения · ${message}`);
      }
    });
    if (host) manager.hostRoom(code, species); else manager.joinRoom(code, species);
  }, []);

  const closeMultiplayer = useCallback(() => {
    mpRef.current?.leave();
    mpRef.current = null;
    setMpLobby({ phase: 'idle' });
    setShowMultiplayer(false);
  }, []);

  const exitToMenu = () => {
    mpRef.current?.leave();
    mpRef.current = null;
    setEngine(null);
    setIsPlaying(false);
    setTutorial(null);
    setMpStatus(null);
    setMpDisconnected(false);
    setMpLobby({ phase: 'idle' });
    setHasSave(SaveManager.hasSave());
  };

  const performOnlineAction = useCallback((x: number, y: number, type: MpActionType) => {
    if (mpRef.current) return mpRef.current.performAction(x, y, type);
    return false;
  }, []);

  if (!isPlaying || !engine) {
    return <>
      <StartScreen hasSave={hasSave} onStartNewGame={startGame} onContinueGame={continueGame} onOpenMultiplayer={() => { setMpLobby({ phase: 'idle' }); setShowMultiplayer(true); }} onOpenRules={() => setShowRules(true)} onStartTutorial={startTutorial} onStartDaily={startDaily} />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showMultiplayer && <MultiplayerModal lobby={mpLobby} onHost={(code, species) => connectMultiplayer(true, code, species)} onJoin={(code, species) => connectMultiplayer(false, code, species)} onClose={closeMultiplayer} />}
    </>;
  }

  const result = `MYCELIUM\nХод ${engine.turn}\nТерритория ${engine.stats.playerTerritory}\nКрупнейший квадрат ${engine.stats.largestSquareSize || '—'}\nЦепочка ×${engine.stats.maxCombo}\nКод мира ${engine.seed.toString(36).toUpperCase()}`;
  const challengeLink = `${window.location.origin}${window.location.pathname}?seed=${engine.seed.toString(36).toUpperCase()}`;
  const tooltipStyle = hover ? { left: Math.min(window.innerWidth - 250, hover.x + 16), top: Math.min(window.innerHeight - 140, hover.y + 16) } : undefined;
  const manager = mpRef.current?.engine === engine ? mpRef.current : null;
  const duel: DuelHudState | undefined = manager ? {
    role: manager.getRole(),
    round: manager.round,
    isMyTurn: manager.isMyTurn(),
    pending: manager.pendingAction,
    roomCode: manager.roomCode,
    opponentSpecies: manager.isHost ? manager.guestSpecies : manager.hostSpecies,
    disconnected: mpDisconnected,
  } : undefined;
  const actionFeedback = engine.lastResult ?? (manager?.lastMove
    ? { id: manager.lastMove.id, title: manager.lastMove.title, detail: manager.lastMove.detail, tone: manager.lastMove.accepted ? 'good' as const : 'bad' as const }
    : null);

  return <main className="game-root grain">
    <GameCanvas engine={engine} onRendererReady={(renderer) => { rendererRef.current = renderer; }} onOnlineAction={mpRef.current ? performOnlineAction : undefined} />
    {!engine.gameOver && !engine.gameWon && <HUD engine={engine} duel={duel} onOpenRules={() => setShowRules(true)} onOpenStats={() => setShowStats(true)} onCenterCore={() => rendererRef.current?.camera.centerOnTile(engine.coreX, engine.coreY)} onExit={exitToMenu} />}
    {mpStatus && <div className={`connection-alert ${mpDisconnected ? 'error' : 'note'}`} role="status">{mpStatus}</div>}
    {actionFeedback && !engine.gameOver && !engine.gameWon && <aside key={actionFeedback.id} className={`action-result ${actionFeedback.tone}`} aria-live="polite"><small>ПОСЛЕДНИЙ ИСХОД</small><strong>{actionFeedback.title}</strong><p>{actionFeedback.detail}</p></aside>}
    {hover && <div className="cell-tooltip" style={tooltipStyle}><strong>{hover.title}</strong>{hover.lines.map((line) => <span key={line}>{line}</span>)}</div>}
    <EventBanner event={engine.lastEvent} suppressed={suppressLoadedEvent} />
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {showStats && <StatsModal stats={engine.stats} seed={engine.seed} onClose={() => setShowStats(false)} />}
    {tutorialStep !== null && !engine.gameOver && !engine.gameWon && <aside className="tutorial-card"><small>Урок {tutorialStep + 1} / {TUTORIAL.length}</small><h3>{TUTORIAL[tutorialStep][0]}</h3><p>{TUTORIAL[tutorialStep][1]}</p>{tutorialStep === 0 && <button className="solid-button" onClick={() => { engine.tutorialTarget = '2:0'; setTutorial(1); engine.refresh(); }}>Начать</button>}{tutorialStep === 6 && <button className="solid-button" onClick={() => { engine.tutorialMode = false; exitToMenu(); }}>Завершить</button>}</aside>}
    {engine.gameWon && <div className="modal-backdrop"><section className="modal run-end"><h2>Ядро соперника захвачено.</h2><p>Теперь субстрат принадлежит вашей колонии.</p><div className="stats-line"><div className="stat"><small>Ходов</small><b>{engine.turn}</b></div><div className="stat"><small>Территория</small><b>{engine.stats.playerTerritory}</b></div></div><div className="button-row"><button className="solid-button" onClick={exitToMenu}>Главное меню</button></div></section></div>}
    {engine.gameOver && <div className="modal-backdrop"><section className="modal run-end"><h2>Ядро пало.</h2><p>Колония погибла, но тот же субстрат можно исследовать снова.</p><div className="stats-line"><div className="stat"><small>Ходов</small><b>{engine.turn}</b></div><div className="stat"><small>Пик территории</small><b>{engine.stats.maxPlayerTerritory}</b></div><div className="stat"><small>Крупнейший квадрат</small><b>{engine.stats.largestSquareSize ? `${engine.stats.largestSquareSize}×${engine.stats.largestSquareSize}` : '—'}</b></div><div className="stat"><small>Лучшая цепочка</small><b>×{engine.stats.maxCombo}</b></div></div><div className="button-row"><button className="solid-button" onClick={exitToMenu}>Новый мир</button><button className="quiet-button" onClick={() => { copyText(result); setCopied('Результат скопирован'); }}>Скопировать результат</button><button className="quiet-button" onClick={() => { copyText(challengeLink); setCopied('Ссылка скопирована'); }}>Ссылка-вызов</button></div>{copied && <p>{copied}</p>}</section></div>}
  </main>;
}
