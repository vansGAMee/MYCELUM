'use client';

import { useState } from 'react';
import { GAME_CONFIG, type SpeciesId } from '../game/config';

interface StartScreenProps {
  hasSave: boolean;
  onStartNewGame: (species: SpeciesId) => void;
  onContinueGame: () => void;
  onOpenMultiplayer: () => void;
  onOpenRules: () => void;
  onStartTutorial: () => void;
  onStartDaily: (species: SpeciesId) => void;
}

const SPECIES: SpeciesId[] = ['cyan', 'coral', 'yellow', 'magenta', 'violet'];

export function StartScreen(props: StartScreenProps) {
  const [species, setSpecies] = useState<SpeciesId>('cyan');
  const selected = GAME_CONFIG.colors.species[species];
  return (
    <main className="substrate grain">
      <div className="menu-shell">
        <section>
          <div className="colony-mark" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div>
          <div className="brand-kicker">Чёрный Субстрат</div>
          <h1 className="brand-title">Mycelium</h1>
          <p className="brand-copy"><strong>Прочти колонию. Замкни квадрат. Защити Ядро.</strong><br />Живая территориальная стратегия о предвидении, геометрии и давлении.</p>
        </section>
        <section className="menu-actions" aria-label="Главное меню">
          <div className="species-row" aria-label="Выбор семейства">
            {SPECIES.map((id) => {
              const config = GAME_CONFIG.colors.species[id];
              return <button key={id} className="species-dot" style={{ '--species': config.cssHex } as React.CSSProperties} aria-pressed={species === id} onClick={() => setSpecies(id)} title={`${config.name} — ${config.passiveName}`}><i />{config.name.split(' ')[0]}</button>;
            })}
          </div>
          <div className="species-note"><strong style={{ color: selected.cssHex }}>{selected.name} · {selected.title}</strong><br />{selected.passiveDesc}</div>
          <button className="menu-primary" disabled={!props.hasSave} onClick={props.onContinueGame}>Продолжить</button>
          <button className="menu-primary" onClick={() => props.onStartNewGame(species)}>Новый мир</button>
          <button className="menu-link" onClick={() => props.onStartDaily(species)}>Испытание дня</button>
          <button className="menu-link" onClick={props.onOpenMultiplayer}>Онлайн 1 на 1</button>
          <button className="menu-link" onClick={props.onStartTutorial}>Обучение в игре</button>
          <button className="menu-link" onClick={props.onOpenRules}>Как играть</button>
          <a className="menu-link" href="/wiki/">Атлас мира</a>
        </section>
      </div>
    </main>
  );
}
