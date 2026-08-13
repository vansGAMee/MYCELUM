'use client';

import React from 'react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const fontMono = { fontFamily: "'JetBrains Mono', monospace" };
  const fontSans = { fontFamily: "'Outfit', sans-serif" };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', padding: 16, userSelect: 'none',
    }}>
      <div className="tactical-glass" style={{
        maxWidth: 520, width: '100%', borderRadius: 24, padding: 32,
        display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#fff', ...fontSans }}>
            ПРАВИЛА ИГРЫ (RULES)
          </h2>
          <button onClick={onClose} className="tactical-btn" style={{
            padding: '4px 10px', borderRadius: 8, fontSize: '0.7rem',
            backgroundColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa', border: 'none', cursor: 'pointer',
          }}>
            [✕]
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.8rem', color: '#d4d4d8', lineHeight: 1.6, ...fontSans }}>
          <div>
            <b style={{ color: '#22d3ee', ...fontMono }}>🎯 ЦЕЛЬ (GOAL)</b>
            <p style={{ margin: '4px 0 0 0' }}>Защищайте своё <b>Ядро (◉)</b> и расширяйте территорию колонии.</p>
          </div>

          <div>
            <b style={{ color: '#00e5ff', ...fontMono }}>1. ИССЛЕДОВАНИЕ (REVEAL)</b>
            <p style={{ margin: '4px 0 0 0' }}>Кликайте по пограничным темным клеткам. Наведение показывает вероятность вашей породы (напр. <code>LIKELY CYAN 74%</code>).</p>
          </div>

          <div>
            <b style={{ color: '#ff4444', ...fontMono }}>2. АТАКА (ATTACK)</b>
            <p style={{ margin: '4px 0 0 0' }}>Кликайте по открытым клеткам врага рядом с вашей территорией для атаки. Шанс успеха зависит от союзников поблизости (напр. <code>ATTACK 75%</code>).</p>
          </div>

          <div>
            <b style={{ color: '#6ee7b7', ...fontMono }}>3. ПЕРЕКРАСКА (REPAINT [R])</b>
            <p style={{ margin: '4px 0 0 0' }}>Гарантированный захват соседней клетки врага без риска (старт 2/3, максимум 3). Квадраты $4\times4$+ восстанавливают +1 заряд.</p>
          </div>

          <div>
            <b style={{ color: '#34d399', ...fontMono }}>4. КВАДРАТЫ (SQUARES)</b>
            <p style={{ margin: '4px 0 0 0' }}>Замкните рамку $3\times3$+ одного цвета. Вся внутренняя область закрасится и укрепится броней.</p>
          </div>

          <div>
            <b style={{ color: '#fbbf24', ...fontMono }}>5. НАМЕРЕНИЯ ВРАГА (ENEMY INTENTS)</b>
            <p style={{ margin: '4px 0 0 0' }}>Враги анонсируют свои атаки стрелками ЗАРАНЕЕ перед вашим ходом. Перекраска или уничтожение врага немедленно отменяет его атаку!</p>
          </div>

          <div style={{ padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b81' }}>
            <b>☠ ПОРАЖЕНИЕ (DEFEAT)</b>: Если враг захватывает клетку вашего <b>Ядра (◉)</b> — игра завершается.
          </div>
        </div>

        <button onClick={onClose} className="tactical-btn" style={{
          width: '100%', padding: '12px', borderRadius: 14, backgroundColor: '#ffffff', color: '#000',
          fontWeight: 800, fontSize: '0.8rem', border: 'none', cursor: 'pointer', marginTop: 8,
        }}>
          ПОНЯТНО
        </button>
      </div>
    </div>
  );
};
