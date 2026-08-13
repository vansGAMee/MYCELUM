'use client';

import React from 'react';
import { EventLogEntry } from '../game/types';

interface EventHistoryProps {
  logs: EventLogEntry[];
  onClose: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 64,
  right: 16,
  bottom: 64,
  width: 320,
  zIndex: 30,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  color: '#fff',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  paddingBottom: 12,
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontWeight: 700,
  color: '#d4d4d4',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  margin: 0,
};

const closeBtnStyle: React.CSSProperties = {
  color: '#a3a3a3',
  fontSize: 12,
  paddingLeft: 8,
  paddingRight: 8,
  paddingTop: 4,
  paddingBottom: 4,
  borderRadius: 8,
  backgroundColor: '#171717',
  border: 'none',
  cursor: 'pointer',
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingRight: 4,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const emptyStyle: React.CSSProperties = {
  color: '#737373',
  textAlign: 'center',
  paddingTop: 24,
  paddingBottom: 24,
};

const cardStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const turnLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#a3a3a3',
};

function getTextStyle(type: EventLogEntry['type']): React.CSSProperties {
  switch (type) {
    case 'event':
      return { color: '#67e8f9', fontWeight: 700 };
    case 'square':
      return { color: '#6ee7b7' };
    case 'combo':
      return { color: '#fcd34d', fontWeight: 700 };
    default:
      return { color: '#e5e5e5' };
  }
}

export const EventHistory: React.FC<EventHistoryProps> = ({ logs, onClose }) => {
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>
          CHRONOLOGICAL LOG
        </h3>
        <button
          onClick={onClose}
          style={closeBtnStyle}
        >
          CLOSE
        </button>
      </div>

      <div style={listStyle}>
        {logs.length === 0 ? (
          <div style={emptyStyle}>No events recorded yet.</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={cardStyle}>
              <div style={turnLabelStyle}>TURN {log.turn}</div>
              <div style={getTextStyle(log.type)}>
                {log.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
