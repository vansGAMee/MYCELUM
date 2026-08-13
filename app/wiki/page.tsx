'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GAME_CONFIG } from '../../game/config';

type AlmanacCategory = 'species' | 'examples' | 'strains' | 'anomalies';

interface SpeciesInfo {
  id: string;
  name: string;
  hex: string;
  title: string;
  lore: string;
  quote: string;
  aggression: string;
  defense: string;
  strategy: string;
}

const SPECIES_ALMANAC: Record<string, SpeciesInfo> = {
  cyan: {
    id: 'cyan',
    name: 'Cyan Spire (Циановая Спираль)',
    hex: '#00e5ff',
    title: 'Первородная Культура Сознания',
    lore: 'Циановая Спираль произрастает из глубоководных крио-термальных источников. Её мицелиальные нити передают высокочастотные электро-биохимические сигналы, позволяя колонии быстро реагировать на внешние угрозы.',
    quote: '«Мы не просто расширяемся. Мы исчисляем структуру этого пространства.»',
    aggression: 'Высокая (High)',
    defense: 'Средняя (Medium)',
    strategy: 'Основная культура игрока. Отлично подходит для быстрого построения замкнутых квадратов и оборонительных периметров.',
  },
  coral: {
    id: 'coral',
    name: 'Coral Bloom (Кораловый Всплеск)',
    hex: '#ff4757',
    title: 'Агрессивный Фронтальный Хищник',
    lore: 'Красный кораловый мицелий питается органическими солями соседних культур. Известен своей привычкой немедленно стремиться к Ядру оппонента, устремляя острые гифы прямо в защитные щиты.',
    quote: '«Твоё Ядро высасывается досуха...»',
    aggression: 'Экстремальная (Extreme)',
    defense: 'Низкая (Low)',
    strategy: 'Защищайте периметр Ядра от Коралового Всплеска в первую очередь! Не давайте ему окружить ваши стартовые клетки.',
  },
  yellow: {
    id: 'yellow',
    name: 'Sol Flare (Солнечная Вспышка)',
    hex: '#ffa502',
    title: 'Экспансионист Фронтира',
    lore: 'Оранжевая солнечная порода разрастается широкими пластами вдоль периферии. Использует фото-синтетические пигменты для ускоренного покрытия свободных территорий.',
    quote: '«Солнце восходит там, где мы пустили корни.»',
    aggression: 'Средняя (Medium)',
    defense: 'Высокая (High)',
    strategy: 'Пытается отрезать игрок от пустых клеток. Перекрашивайте ключевые узлы Sol Flare, чтобы захватывать их территории целыми прямоугольниками.',
  },
  magenta: {
    id: 'magenta',
    name: 'Velvet Pulse (Бархатный Пульс)',
    hex: '#ff007f',
    title: 'Паразитический Плетень',
    lore: 'Пурпурный бархатный мицелий вырабатывает ферменты, разрушающие связи соседних видов. Вступает в симбиоз с мутациями штамма Паразит.',
    quote: '«Один клик мимо — и твоя территория принадлежит нам.»',
    aggression: 'Высокая (High)',
    defense: 'Высокая (High)',
    strategy: 'Блокируйте Velvet Pulse двойными усиленными стенами $3 \times 3$.',
  },
  violet: {
    id: 'violet',
    name: 'Void Lotus (Лотос Бездны)',
    hex: '#a55eea',
    title: 'Теневой Оракул',
    lore: 'Фиолетовый Лотос Бездны произрастает в местах аномалий и мертвых зон. Редко проявляет активную агрессию, но укрепляет свои границы невероятно плотными споровыми щитами.',
    quote: '«Бездна не нападает. Бездна просто поглощает.»',
    aggression: 'Низкая (Low)',
    defense: 'Максимальная (Max)',
    strategy: 'Лучшая цель для захвата через окружение рамкой $4 \times 4$.',
  },
};

export default function WikiPage() {
  const [category, setCategory] = useState<AlmanacCategory>('examples');
  const [selectedItem, setSelectedItem] = useState<string>('cyan');

  const activeSpecies = SPECIES_ALMANAC[selectedItem] || SPECIES_ALMANAC['cyan'];

  const codeBox: React.CSSProperties = {
    backgroundColor: '#050508', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
    padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.5,
    color: '#34d399', whiteSpace: 'pre', overflowX: 'auto',
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#030305', color: '#e5e5e5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none',
    }}>
      <div style={{ maxWidth: 940, width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: '2.2rem', fontWeight: 900, margin: 0,
              background: 'linear-gradient(to right, #22d3ee, #a78bfa, #ec4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em',
            }}>
              АЛЬМАНАХ ГРИБНОГО МИРА (ALMANAC)
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#737373', fontFamily: 'monospace', marginTop: 4 }}>
              Visual Examples, PvZ Style Bio-Encyclopedia & Strategy Guide
            </p>
          </div>

          <Link href="/" style={{
            padding: '10px 20px', borderRadius: 12, backgroundColor: '#ffffff', color: '#000',
            fontWeight: 900, fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.05em',
          }}>
            В ИГРУ ←
          </Link>
        </div>

        {/* Category Nav */}
        <div style={{
          display: 'flex', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)',
          padding: 6, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto',
        }}>
          <button
            onClick={() => setCategory('examples')}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 800,
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace',
              backgroundColor: category === 'examples' ? '#22d3ee' : 'transparent',
              color: category === 'examples' ? '#000' : '#a3a3a3',
            }}
          >
            📊 НАГЛЯДНЫЕ ПРИМЕРЫ СХЕМ
          </button>
          <button
            onClick={() => { setCategory('species'); setSelectedItem('cyan'); }}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 800,
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace',
              backgroundColor: category === 'species' ? '#22d3ee' : 'transparent',
              color: category === 'species' ? '#000' : '#a3a3a3',
            }}
          >
            🍄 АЛЬМАНАХ ПОРОД
          </button>
          <button
            onClick={() => setCategory('strains')}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 800,
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace',
              backgroundColor: category === 'strains' ? '#22d3ee' : 'transparent',
              color: category === 'strains' ? '#000' : '#a3a3a3',
            }}
          >
            🧬 МУТАЦИИ И ШТАММЫ
          </button>
          <button
            onClick={() => setCategory('anomalies')}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 800,
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'monospace',
              backgroundColor: category === 'anomalies' ? '#22d3ee' : 'transparent',
              color: category === 'anomalies' ? '#000' : '#a3a3a3',
            }}
          >
            🌌 АНОМАЛИИ МИРА
          </button>
        </div>

        {/* VISUAL EXAMPLES TAB */}
        {category === 'examples' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Example 1: Core Defense */}
            <div style={{
              backgroundColor: 'rgba(10,10,14,0.85)', border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#34d399', margin: 0 }}>
                1. СХЕМА ЗАЩИТЫ ЯДРА (CORE DEFENSE)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Для надежной защиты у держите ромб Ядра (◉) внутри замкнутого кольца ваших клеток:
              </p>
              <div style={codeBox}>{`[БРОНИРОВАННОЕ КОЛЬЦО ЯДРА]
🩵 🩵 🩵 🩵 🩵
🩵 🩵 🩵 🩵 🩵
🩵 🩵 ◉ 🩵 🩵  ← ◉ ВАШЕ ЯДРО (CORE ●●●)
🩵 🩵 🩵 🩵 🩵
🩵 🩵 🩵 🩵 🩵`}</div>
              <div style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>
                Пока вокруг Ядра есть кольцо своих клеток, враг не сможет запустить осаду!
              </div>
            </div>

            {/* Example 2: Loss State */}
            <div style={{
              backgroundColor: 'rgba(10,10,14,0.85)', border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ff4444', margin: 0 }}>
                2. СХЕМА ПОРАЖЕНИЯ (LOSS STATE)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Если вражеские колонии (🟥) окружают Ядро (4+ клеток в осаде или 8/8 заслон) — наступает мгновенное поражение:
              </p>
              <div style={{ ...codeBox, color: '#ff6b81', border: '1px solid rgba(255,68,68,0.3)' }}>{`[СИТУАЦИЯ ПОРАЖЕНИЯ (DEFEAT)]
🟥 🟥 🟥 🟥 🟥
🟥 🟥 🟥 🟥 🟥
🟥 🟥 ◉ 🟥 🟥  ← ☠ ВРАГИ ОКРУЖИЛИ ЯДРО (8/8)!
🟥 🟥 🟥 🟥 🟥     (Мгновенный крах Ядра!)
🟥 🟥 🟥 🟥 🟥`}</div>
              <div style={{ fontSize: '0.75rem', color: '#ff7885' }}>
                Используйте клавишу [R] (REPAINT), чтобы вовремя разрывать вражескую осаду!
              </div>
            </div>

            {/* Example 3: Square Capture Blast */}
            <div style={{
              backgroundColor: 'rgba(10,10,14,0.85)', border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#22d3ee', margin: 0 }}>
                3. СХЕМА ЗАХВАТА И УДАРНОЙ ВОЛНЫ
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Замкните рамочный периметр. Внутренность закрасится, а враги во внешнем радиусе взрываются:
              </p>
              <div style={codeBox}>{`[ДО ЗАХВАТА]             [ПОСЛЕ ЗАХВАТА ВЗРЫВОМ]
🩵 🩵 🩵 🩵 🩵              🩵 🩵 🩵 🩵 🩵
🩵 ⬛ ⬛ 🩵 🟥  -УДАР!->    🩵 🩵 🩵 🩵 💥 <- Враг взорван!
🩵 ⬛ ⬛ 🩵 🟥             🩵 🩵 🩵 🩵 💥
🩵 🩵 🩵 🩵 🩵              🩵 🩵 🩵 🩵 🩵`}</div>
              <div style={{ fontSize: '0.75rem', color: '#22d3ee' }}>
                Каждый захваченный квадрат даёт +1 Перекраску [R]!
              </div>
            </div>

            {/* Example 4: Victory State */}
            <div style={{
              backgroundColor: 'rgba(10,10,14,0.85)', border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#a78bfa', margin: 0 }}>
                4. СХЕМА ПОБЕДЫ (VICTORY STATE)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                В 1v1 режиме уничтожьте Ядро противника (`[☠ ЯДРО ВРАГА]`), или захватите 50+ клеток в одиночном режиме:
              </p>
              <div style={{ ...codeBox, color: '#c4b5fd' }}>{`[УСЛОВИЯ ПОБЕДЫ]
1. 1v1 Режим: Уничтожьте Ядро Врага (☠) в точке X=10, Y=10.
2. Solo Режим: Захватите 50+ клеток территории колонии.
3. Истребление: Полностью стереть все вражеские штаммы.`}</div>
              <div style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>
                Вызовет экран «COLONY DOMINANCE! ПОБЕДА».
              </div>
            </div>
          </div>
        )}

        {/* SPECIES ALMANAC */}
        {category === 'species' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
            {/* Left list selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.values(SPECIES_ALMANAC).map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedItem(sp.id)}
                  style={{
                    padding: 14, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                    border: selectedItem === sp.id ? `2px solid ${sp.hex}` : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: selectedItem === sp.id ? `${sp.hex}22` : 'rgba(10,10,14,0.6)',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: sp.hex, display: 'inline-block' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#fff' }}>{sp.name.split(' ')[0]}</div>
                    <div style={{ fontSize: '0.65rem', color: '#a3a3a3', fontFamily: 'monospace' }}>{sp.title}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Detailed Inspect Panel */}
            <div style={{
              backgroundColor: 'rgba(10,10,14,0.9)', border: `1px solid ${activeSpecies.hex}44`,
              borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: `0 0 30px ${activeSpecies.hex}22`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16, backgroundColor: activeSpecies.hex,
                  boxShadow: `0 0 20px ${activeSpecies.hex}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1.2rem', color: '#000',
                }}>
                  ◉
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: 0 }}>{activeSpecies.name}</h2>
                  <div style={{ fontSize: '0.75rem', color: activeSpecies.hex, fontFamily: 'monospace', fontWeight: 700 }}>
                    {activeSpecies.title}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#737373', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  БИОЛОГИЧЕСКОЕ ОПИСАНИЕ:
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ddd', lineHeight: 1.65 }}>
                  {activeSpecies.lore}
                </div>
              </div>

              <div style={{
                padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)',
                borderLeft: `4px solid ${activeSpecies.hex}`, fontStyle: 'italic', fontSize: '0.8rem', color: '#bbb',
              }}>
                {activeSpecies.quote}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <div style={{ padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#737373' }}>УРОВЕНЬ АГРЕССИИ:</span>
                  <div style={{ color: '#ff4444', fontWeight: 800, fontSize: '0.9rem', marginTop: 2 }}>{activeSpecies.aggression}</div>
                </div>
                <div style={{ padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#737373' }}>ПЛОТНОСТЬ ЗАЩИТЫ:</span>
                  <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.9rem', marginTop: 2 }}>{activeSpecies.defense}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#737373', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  ТАКТИЧЕСКИЙ СОВЕТ:
                </div>
                <div style={{ fontSize: '0.8rem', color: '#34d399', lineHeight: 1.5 }}>
                  {activeSpecies.strategy}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STRAINS ALMANAC */}
        {category === 'strains' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 20, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#22d3ee' }}>⚡ ШТАММ «БЫСТРЫЙ»</div>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.6 }}>
                Обладает ускоренным в 2 раза метаболизмом. Совершает молниеносные броски к соседним незащищенным клеткам.
              </p>
              <div style={{ fontSize: '0.7rem', color: '#34d399', fontFamily: 'monospace' }}>ЭФФЕКТ: +15% к шансу экспансии за ход.</div>
            </div>

            <div style={{ padding: 20, borderRadius: 20, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#a78bfa' }}>🛡️ ШТАММ «БРОНИРОВАННЫЙ»</div>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.6 }}>
                Формирует хитиновые микро-оболочки вокруг спор. Сопротивляется поглощению и перекраске.
              </p>
              <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontFamily: 'monospace' }}>ЭФФЕКТ: -50% к шансу захвата другими видами.</div>
            </div>

            <div style={{ padding: 20, borderRadius: 20, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(236,72,153,0.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ec4899' }}>👾 ШТАММ «ПАРАЗИТ»</div>
              <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.6 }}>
                Выделяет разрушительный фермент, растворяющий стенки клеток игрока при прямом соприкосновении.
              </p>
              <div style={{ fontSize: '0.7rem', color: '#ec4899', fontFamily: 'monospace' }}>ЭФФЕКТ: Внедряется в чужие территории на 40% активнее.</div>
            </div>
          </div>
        )}

        {/* ANOMALIES ALMANAC */}
        {category === 'anomalies' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#22d3ee' }}>🌌 КОСМИЧЕСКИЙ ЩЕЛЧОК (COSMIC SNAP)</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Глобальный коллапс видимости. Половина всех открытых клеток (кроме Ядра) снова скрываются во тьме, сохраняя своё внутреннее состояние.
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fbbf24' }}>🌧️ СПОРОВЫЙ ДОЖДЬ (SPORE RAIN)</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Внезапный гигантский выброс спор вражеского вида на границе открытого фронтира.
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ff4444' }}>☠️ МЕРТВАЯ ЗОНА (DEAD ZONE)</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Токсичный разлом 3x3 разрушает клетчатую структуру в эпицентре аномалии.
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 16, backgroundColor: 'rgba(10,10,14,0.8)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#34d399' }}>🌿 ВСПЫШКА РОСТА (BLOOM)</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.5 }}>
                Благоприятный био-импульс ускоряет развитие выбранного вида мицелия в 3 раза на 10 ходов.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
