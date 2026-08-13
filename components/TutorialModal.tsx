'use client';

import React, { useState } from 'react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', padding: 16, userSelect: 'none',
  };

  const card: React.CSSProperties = {
    maxWidth: 540, width: '100%', backgroundColor: '#0a0a0c', border: '1px solid rgba(34,211,238,0.35)',
    borderRadius: 24, padding: 28, color: '#fff', display: 'flex', flexDirection: 'column', gap: 20,
    boxShadow: '0 25px 50px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto', margin: 'auto',
  };

  const stepTitle: React.CSSProperties = {
    fontSize: '0.75rem', fontFamily: 'monospace', color: '#22d3ee', letterSpacing: '0.1em',
    textTransform: 'uppercase', fontWeight: 800,
  };

  const codeBox: React.CSSProperties = {
    backgroundColor: '#050508', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
    padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5,
    color: '#34d399', whiteSpace: 'pre', overflowX: 'auto',
  };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <span style={stepTitle}>ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ ({step}/6)</span>
          <button onClick={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#a3a3a3', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer' }}>
            ПРОПУСТИТЬ [✕]
          </button>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              1. ИССЛЕДОВАНИЕ ФРОНТИРА (FRONTIER)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Ваше <b>Ядро (◉)</b> — ваша жизнь. Каждым ходом открывайте темные клетки, непосредственно примыкающие к вашей территории:
            </p>
            <div style={codeBox}>{`[СТАРТОВАЯ КОЛОНИЯ 3×3]
🩵 🩵 🩵
🩵 ◉ 🩵  ← ◉ Ваше Ядро
🩵 🩵 🩵`}</div>
            <p style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>
              Клик по темным клеткам фронтира расширяет границы вашей фракции.
            </p>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#22d3ee', margin: 0 }}>
              2. ПРЕДСКАЗАНИЕ КЛЕТОК (PROBABILITY)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Клетки не случайны! При наведении курсора система показывает биологическое давление и прогноз:
            </p>
            <div style={codeBox}>{`[ПРОГНОЗ КЛЕТКИ]
LIKELY: CYAN (74%)
CONFIDENCE: HIGH`}</div>
            <p style={{ fontSize: '0.75rem', color: '#34d399' }}>
              Выбирайте клетки с высокой вероятностью вашего цвета для построения фининсовых заслонов!
            </p>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399', margin: 0 }}>
              3. ЗАХВАТ КВАДРАТОМ (SQUARE FILL)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Замкните рамку $3 \times 3$ или $4 \times 4$ одного цвета. Вся внутренняя область закрасится и забронируется:
            </p>
            <div style={codeBox}>{`[ДО ЗАХВАТА]             [ПОСЛЕ ЗАХВАТА]
🩵 🩵 🩵 🩵              🩵 🩵 🩵 🩵
🩵 ⬛ ⬛ 🩵   -ЗАХВАТ!-> 🩵 🩵 🩵 🩵
🩵 🩵 🩵 🩵              🩵 🩵 🩵 🩵`}</div>
            <p style={{ fontSize: '0.75rem', color: '#34d399' }}>
              Захват $4 \times 4$+ даёт +1 Заряд Перекраски `REPAINT [R]`!
            </p>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff4444', margin: 0 }}>
              4. АНОНС НАМЕРЕНИЙ ВРАГА (ENEMY INTENT)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Враги анонсируют свои ходы ЗАРАНЕЕ перед вашим кликом! Направление атаки отображается цветными стрелками:
            </p>
            <div style={{ ...codeBox, color: '#ff6b81' }}>{`[АНОНС АТАКИ ВРАГА]
🔴 → [ВАША КЛЕТКА]  (Атака произойдёт после вашего хода)`}</div>
          </div>
        )}

        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6ee7b7', margin: 0 }}>
              5. ПЕРЕКРАСКА (`REPAINT [R]`)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Используйте клавишу `R` или кнопку `REPAINT (2/3)`, чтобы перекрасить под угрозой находящуюся пограничную клетку врага.
            </p>
          </div>
        )}

        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff4444', margin: 0 }}>
              6. ЕДИНСТВЕННОЕ УСЛОВИЕ ПОРАЖЕНИЯ
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
              Если вражеский мицелий захватит клетку вашего <b>Ядра (◉)</b> — раунд немедленно завершается поражением!
            </p>
            <div style={{ ...codeBox, color: '#ff4444' }}>{`⚠️ CORE IN DANGER
(Защищайте клетку Ядра от вражеских атак!)`}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} style={{
              padding: '8px 16px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff',
              border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            }}>
              ← НАЗАД
            </button>
          ) : <div />}

          {step < 6 ? (
            <button onClick={() => setStep(step + 1)} style={{
              padding: '8px 16px', borderRadius: 10, backgroundColor: '#22d3ee', color: '#000',
              border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
            }}>
              ДАЛЕЕ →
            </button>
          ) : (
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 10, backgroundColor: '#34d399', color: '#000',
              border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
            }}>
              ПОНЯТНО! ИГРАТЬ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
