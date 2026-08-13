'use client';

import React, { useEffect, useState } from 'react';
import { WorldEvent } from '../game/types';

interface EventBannerProps {
  event: WorldEvent | null;
}

export const EventBanner: React.FC<EventBannerProps> = ({ event }) => {
  const [currentEvent, setCurrentEvent] = useState<WorldEvent | null>(null);

  useEffect(() => {
    if (event) {
      setCurrentEvent(event);
      const timer = setTimeout(() => setCurrentEvent(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [event]);

  if (!currentEvent) return null;

  return (
    <div style={{
      position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40, pointerEvents: 'auto', transition: 'all 300ms',
    }}>
      <div style={{
        padding: '16px 24px', borderRadius: 16, backgroundColor: 'rgba(5,5,8,0.92)',
        backdropFilter: 'blur(30px)', border: '1px solid rgba(34,211,238,0.4)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)', textAlign: 'center', maxWidth: 420,
        display: 'flex', flexDirection: 'column', gap: 8, color: '#fff',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em',
          color: '#22d3ee', textTransform: 'uppercase', fontWeight: 800,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>СОБЫТИЕ МИРА — ХОД {currentEvent.turn}</span>
          <button
            onClick={() => setCurrentEvent(null)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 700,
            }}
          >
            ЗАКРЫТЬ [✕]
          </button>
        </div>

        <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
          {currentEvent.title}
        </div>

        <div style={{ fontSize: 12, color: '#d4d4d4', lineHeight: 1.5, fontFamily: 'sans-serif' }}>
          {currentEvent.description}
        </div>
      </div>
    </div>
  );
};
