import assert from 'node:assert/strict';
import test from 'node:test';
import { GameEngine } from '../game/engine';
import { SaveManager } from '../game/save';
import type { EnemyIntent } from '../game/types';

function own(game: GameEngine, x: number, y: number, species = game.playerSpecies) {
  const cell = game.world.getCell(x, y);
  cell.currentSpeciesId = species;
  cell.naturalSpeciesId = species;
  cell.claimed = true;
  cell.revealed = true;
  cell.isSnapHidden = false;
  return cell;
}

function hide(game: GameEngine, x: number, y: number, natural = game.playerSpecies) {
  const cell = game.world.getCell(x, y);
  cell.naturalSpeciesId = natural;
  cell.currentSpeciesId = natural;
  cell.claimed = false;
  cell.revealed = false;
  return cell;
}

test('fresh world starts at turn 1 with exactly 9 owned cells', () => {
  const game = new GameEngine('cyan', 101);
  assert.equal(game.turn, 1);
  assert.equal(game.stats.playerTerritory, 9);
  assert.equal(game.repaintCharges, 2);
  assert.equal(game.world.getCell(0, 0).isCore, true);
  assert.equal(game.gameOver, false);
  assert.deepEqual(game.activeIntents, []);
});

test('a new engine cannot leak old ownership, intents, events, or mutations', () => {
  const old = new GameEngine('cyan', 1);
  own(old, 20, 20);
  old.activeIntents.push({ id: 'old', sourceCell: '3:3', sourceSpeciesId: 'coral', targetCell: '2:2', actionType: 'attack', chance: 100, createdTurn: 1 });
  old.strains.push({ id: 'old', speciesId: 'coral', name: 'old', trait: 'swift', colorHex: 0, cssHex: '#000' });
  const fresh = new GameEngine('cyan', 2);
  assert.equal(fresh.stats.playerTerritory, 9);
  assert.equal(fresh.world.getExistingCell(20, 20), undefined);
  assert.equal(fresh.activeIntents.length, 0);
  assert.equal(fresh.strains.length, 0);
  assert.equal(fresh.lastEvent, null);
});

test('world species and predictions are deterministic and clustered', () => {
  const a = new GameEngine('cyan', 91234);
  const b = new GameEngine('cyan', 91234);
  assert.deepEqual(a.getSpeciesPrediction(13, -7), b.getSpeciesPrediction(13, -7));
  assert.equal(a.world.getCell(13, -7).naturalSpeciesId, b.world.getCell(13, -7).naturalSpeciesId);
  const center = a.world.getCell(30, 30).naturalSpeciesId;
  const same = Array.from({ length: 25 }, (_, i) => a.world.getCell(28 + (i % 5), 28 + Math.floor(i / 5)).naturalSpeciesId).filter((id) => id === center).length;
  assert.ok(same >= 5);
});

test('normal adjacent attacks are legal and do not spend Repaint', () => {
  const game = new GameEngine('cyan', 3);
  own(game, 2, 0, 'coral');
  game.tutorialMode = true;
  game.tutorialTarget = '2:0';
  assert.ok(game.getLegalActions().attacks.includes('2:0'));
  assert.ok(game.getAttackChance(2, 0) > 0);
  assert.equal(game.attackCell(2, 0), true);
  assert.equal(game.world.getCell(2, 0).currentSpeciesId, 'cyan');
  assert.equal(game.repaintCharges, 2);
});

test('surrounded Core with 0 Repaint still has legal attacks', () => {
  const game = new GameEngine('cyan', 4);
  game.repaintCharges = 0;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) if (x || y) own(game, x, y, 'coral');
  const legal = game.getLegalActions();
  assert.equal(legal.attacks.length, 8);
  assert.equal(legal.repaints.length, 0);
});

test('capturing an intent source removes the intent and Core danger permanently', () => {
  const game = new GameEngine('cyan', 5);
  own(game, 0, -1, 'coral');
  const intent: EnemyIntent = { id: 'threat', sourceCell: '0:-1', sourceSpeciesId: 'coral', targetCell: '0:0', actionType: 'attack', chance: 100, createdTurn: 1 };
  game.activeIntents = [intent];
  game.validateAndCleanIntents();
  assert.equal(game.isCoreInDanger, true);
  game.tutorialMode = true;
  game.tutorialTarget = '0:-1';
  assert.equal(game.repaintCell(0, -1), true);
  assert.equal(game.activeIntents.length, 0);
  assert.equal(game.isCoreInDanger, false);
  game.validateAndCleanIntents();
  assert.equal(game.activeIntents.length, 0);
});

test('territory counts ownership while fog only changes perception', () => {
  const game = new GameEngine('cyan', 6);
  for (let i = 0; i < 11; i++) {
    const cell = own(game, 10 + i, 10);
    if (i < 5) cell.isSnapHidden = true;
  }
  game.updateStats();
  assert.equal(game.stats.playerTerritory, 20);
});

test('Repaint decrements and never exceeds its permanent cap', () => {
  const game = new GameEngine('cyan', 7);
  own(game, 2, 0, 'coral');
  game.repaintCharges = 2;
  game.tutorialMode = true;
  game.tutorialTarget = '2:0';
  game.repaintCell(2, 0);
  assert.equal(game.repaintCharges, 1);
  game.repaintCharges = 3;
  for (let x = 2; x <= 5; x++) for (let y = -1; y <= 2; y++) if (x === 2 || x === 5 || y === -1 || y === 2) own(game, x, y);
  hide(game, 5, 0);
  game.tutorialTarget = '5:0';
  game.revealCell(5, 0);
  assert.equal(game.repaintCharges, 3);
});

test('3×3 square fills and reinforces its interior exactly once', () => {
  const game = new GameEngine('cyan', 8);
  for (let x = 2; x <= 4; x++) for (let y = -1; y <= 1; y++) if (x === 2 || x === 4 || y === -1 || y === 1) own(game, x, y);
  hide(game, 4, 0);
  hide(game, 3, 0, 'coral');
  game.tutorialMode = true;
  game.tutorialTarget = '4:0';
  game.revealCell(4, 0);
  const interior = game.world.getCell(3, 0);
  assert.equal(interior.currentSpeciesId, 'cyan');
  assert.equal(interior.claimed, true);
  assert.ok(interior.reinforcement >= 2);
  assert.equal(game.lastSquaresMatched.filter((match) => match.minX === 2 && match.minY === -1 && match.size === 3).length, 1);
});

test('a square fill can complete a larger square chain without looping', () => {
  const game = new GameEngine('cyan', 9);
  for (let x = 0; x <= 3; x++) for (let y = 0; y <= 3; y++) if (x === 0 || x === 3 || y === 0 || y === 3) own(game, x, y);
  hide(game, 3, 1);
  for (let x = 2; x <= 4; x++) for (let y = 0; y <= 2; y++) if (x === 2 || x === 4 || y === 0 || y === 2) own(game, x, y);
  hide(game, 4, 2);
  hide(game, 3, 1, 'coral');
  game.tutorialMode = true;
  game.tutorialTarget = '4:2';
  game.revealCell(4, 2);
  assert.ok(game.stats.maxCombo >= 2);
  assert.ok(game.stats.totalSquaresCaptured < 10);
});

test('a successful hostile Core capture ends the run immediately', () => {
  const game = new GameEngine('cyan', 10);
  own(game, 0, -1, 'coral');
  hide(game, 2, 0, 'cyan');
  game.activeIntents = [{ id: 'death', sourceCell: '0:-1', sourceSpeciesId: 'coral', targetCell: '0:0', actionType: 'attack', chance: 100, createdTurn: 1 }];
  game.revealCell(2, 0);
  assert.equal(game.gameOver, true);
  assert.equal(game.world.getCell(0, 0).currentSpeciesId, 'coral');
});

test('save and load preserve seed, ownership, Core, Repaint, event state, and turn', () => {
  const store = new Map<string, string>();
  Object.assign(globalThis, { window: globalThis, localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) } });
  const game = new GameEngine('cyan', 11);
  own(game, 2, 0, 'coral');
  game.tutorialMode = true;
  game.tutorialTarget = '2:0';
  game.repaintCell(2, 0);
  game.tutorialMode = false;
  game.save();
  const data = SaveManager.load();
  assert.ok(data);
  const loaded = GameEngine.loadFromSave(data);
  assert.equal(loaded.seed, game.seed);
  assert.equal(loaded.turn, game.turn);
  assert.equal(loaded.repaintCharges, game.repaintCharges);
  assert.equal(loaded.world.getCell(2, 0).currentSpeciesId, 'cyan');
  assert.equal(loaded.world.getCell(0, 0).isCore, true);
});
