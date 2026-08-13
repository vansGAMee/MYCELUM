'use client';

import { useMemo, useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';

interface MultiplayerModalProps {
  onHost: (roomCode: string, species: SpeciesId) => void;
  onJoin: (roomCode: string, species: SpeciesId) => void;
  onClose: () => void;
}

export function MultiplayerModal({ onHost, onJoin, onClose }: MultiplayerModalProps) {
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [code, setCode] = useState('');
  const [species, setSpecies] = useState<SpeciesId>('cyan');
  const generated = useMemo(() => Math.random().toString(36).slice(2, 7).toUpperCase(), []);
  const room = (mode === 'host' ? code || generated : code).trim().toUpperCase();
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><header className="modal-head"><h2>Online 1v1</h2><button className="icon-button" onClick={onClose}>Close</button></header><p style={{ color: '#98a19a', fontSize: 13, lineHeight: 1.55 }}>A lightweight peer-to-peer duel. No account, lobby, or server data. Host and guest alternate actions on one seeded substrate.</p><div className="button-row"><button className={mode === 'host' ? 'solid-button' : 'quiet-button'} onClick={() => setMode('host')}>Host</button><button className={mode === 'join' ? 'solid-button' : 'quiet-button'} onClick={() => setMode('join')}>Join</button></div><div className="species-row">{(['cyan','coral','yellow','magenta','violet'] as SpeciesId[]).map((id) => <button key={id} className="species-dot" style={{ '--species': GAME_CONFIG.colors.species[id].cssHex } as React.CSSProperties} aria-pressed={species === id} onClick={() => setSpecies(id)}><i />{id}</button>)}</div><label style={{ display: 'block', color: '#879087', fontSize: 10, letterSpacing: '.12em', marginBottom: 8 }}>ROOM CODE</label><input className="field" value={mode === 'host' && !code ? generated : code} onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 8))} onFocus={() => { if (mode === 'host' && !code) setCode(generated); }} /><div className="button-row"><button className="solid-button" disabled={!room} onClick={() => mode === 'host' ? onHost(room, species) : onJoin(room, species)}>{mode === 'host' ? 'Host game' : 'Join game'}</button></div></section></div>;
}
