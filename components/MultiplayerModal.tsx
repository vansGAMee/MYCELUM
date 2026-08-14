'use client';

import { useMemo, useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';

export interface MultiplayerLobbyState {
  phase: 'idle' | 'waiting' | 'error';
  role?: 'host' | 'guest';
  roomCode?: string;
  message?: string;
}

interface MultiplayerModalProps {
  onHost: (roomCode: string, species: SpeciesId) => void;
  onJoin: (roomCode: string, species: SpeciesId) => void;
  onClose: () => void;
  lobby: MultiplayerLobbyState;
}

async function copyRoom(code: string) {
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
}

export function MultiplayerModal({ onHost, onJoin, onClose, lobby }: MultiplayerModalProps) {
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [code, setCode] = useState('');
  const [species, setSpecies] = useState<SpeciesId>('cyan');
  const [copied, setCopied] = useState(false);
  const generated = useMemo(() => Math.random().toString(36).slice(2, 7).toUpperCase(), []);
  const room = (mode === 'host' ? code || generated : code).trim().toUpperCase();

  if (lobby.phase === 'waiting' && lobby.roomCode) {
    const hosting = lobby.role === 'host';
    return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lobby-title">
      <section className="modal lobby-waiting">
        <span className="lobby-signal" aria-hidden="true" />
        <small className="lobby-eyebrow">{hosting ? 'КОМНАТА СОЗДАНА' : 'КОМНАТА НАЙДЕНА'}</small>
        <h2 id="lobby-title">{hosting ? 'Ждём соперника' : 'Подключаемся к Субстрату'}</h2>
        <p>{hosting ? 'Отправьте этот код одному сопернику. Дуэль начнётся, когда обе колонии подтвердят одинаковое состояние мира.' : 'Не закрывайте окно, пока устанавливается прямое соединение между игроками.'}</p>
        <button className="room-code" onClick={() => { void copyRoom(lobby.roomCode!); setCopied(true); }} aria-label="Скопировать код комнаты">
          <span>{lobby.roomCode}</span><small>{copied ? 'СКОПИРОВАНО' : 'СКОПИРОВАТЬ КОД'}</small>
        </button>
        <div className="lobby-pulse" aria-live="polite"><i /> {hosting ? 'ОЖИДАЕМ ГОСТЯ…' : 'ИЩЕМ ХОЗЯИНА…'}</div>
        <button className="quiet-button" onClick={onClose}>Закрыть комнату</button>
      </section>
    </div>;
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="online-title">
    <section className="modal">
      <header className="modal-head"><h2 id="online-title">Онлайн 1 на 1</h2><button className="icon-button" onClick={onClose}>Закрыть</button></header>
      <p className="modal-copy">Пошаговая дуэль с полной информацией. Читайте поле, стройте квадраты и захватите Ядро соперника. Семейства игроков должны различаться; при совпадении гость адаптируется.</p>
      {lobby.phase === 'error' && <div className="room-error" role="alert"><strong>Не удалось подключиться</strong><span>{lobby.message ?? 'Закройте окно и повторите попытку с тем же кодом.'}</span></div>}
      <div className="button-row"><button className={mode === 'host' ? 'solid-button' : 'quiet-button'} onClick={() => setMode('host')}>Создать комнату</button><button className={mode === 'join' ? 'solid-button' : 'quiet-button'} onClick={() => setMode('join')}>Войти по коду</button></div>
      <div className="species-row" aria-label="Выберите колонию">{(['cyan','coral','yellow','magenta','violet'] as SpeciesId[]).map((id) => <button key={id} className="species-dot" style={{ '--species': GAME_CONFIG.colors.species[id].cssHex } as React.CSSProperties} aria-pressed={species === id} onClick={() => setSpecies(id)}><i />{GAME_CONFIG.colors.species[id].shortName}</button>)}</div>
      <label className="field-label" htmlFor="room-code-input">КОД КОМНАТЫ</label>
      <input id="room-code-input" className="field" value={mode === 'host' && !code ? generated : code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 8))} onFocus={() => { if (mode === 'host' && !code) setCode(generated); }} autoComplete="off" />
      <div className="button-row"><button className="solid-button" disabled={!room} onClick={() => mode === 'host' ? onHost(room, species) : onJoin(room, species)}>{mode === 'host' ? 'Создать и ждать' : 'Найти соперника'}</button></div>
    </section>
  </div>;
}
