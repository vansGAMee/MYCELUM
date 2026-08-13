'use client';

import React, { useState } from 'react';
import { SpeciesId } from '../game/config';
import { SPECIES_LIST } from '../game/world';

interface MultiplayerModalProps {
  onHost: (roomCode: string, species: SpeciesId) => void;
  onJoin: (roomCode: string, species: SpeciesId) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({ onHost, onJoin, onClose }) => {
  const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesId>('cyan');

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleStartHost = () => {
    const code = generateCode();
    setRoomCode(code);
    setMode('host');
    onHost(code, selectedSpecies);
  };

  const handleStartJoin = () => {
    if (inputCode.trim().length >= 4) {
      onJoin(inputCode.trim(), selectedSpecies);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', padding: 16, userSelect: 'none',
    }}>
      <div style={{
        maxWidth: 380, width: '100%', backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: 28, color: '#fff', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>ONLINE 1V1 (P2P)</h3>
          <button onClick={onClose} style={{ backgroundColor: '#171717', color: '#a3a3a3', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer' }}>
            CLOSE
          </button>
        </div>

        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={handleStartHost} style={{
              padding: 14, borderRadius: 16, backgroundColor: '#fff', color: '#000', fontWeight: 800,
              fontSize: '0.8rem', border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              HOST GAME
            </button>

            <button onClick={() => setMode('join')} style={{
              padding: 14, borderRadius: 16, backgroundColor: '#171717', color: '#fff', fontWeight: 700,
              fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              JOIN GAME
            </button>
          </div>
        )}

        {mode === 'host' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#a3a3a3', fontFamily: 'monospace' }}>ROOM CODE</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.2em', color: '#22d3ee', fontFamily: 'monospace' }}>
              {roomCode}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#737373', fontFamily: 'monospace' }}>
              Waiting for opponent to connect...
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: '0.75rem', color: '#a3a3a3', fontFamily: 'monospace' }}>ENTER ROOM CODE</div>
            <input
              type="text"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              style={{
                padding: 12, borderRadius: 12, backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.15em',
                fontFamily: 'monospace', outline: 'none',
              }}
            />
            <button onClick={handleStartJoin} style={{
              padding: 12, borderRadius: 12, backgroundColor: '#22d3ee', color: '#000', fontWeight: 800,
              fontSize: '0.8rem', border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              CONNECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
