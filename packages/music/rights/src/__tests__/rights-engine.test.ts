import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RightsEngine, TerritoryService, TERRITORIES } from '@music-ai/rights';

const holders = [
  { id: 'h1', name: 'Artist', role: 'owner' as const, share: 50 },
  { id: 'h2', name: 'Label', role: 'label' as const, share: 30 },
  { id: 'h3', name: 'Publisher', role: 'publisher' as const, share: 20 },
];

test('calculateRoyalties computes total and splits that sum to the total', () => {
  const engine = new RightsEngine();
  const calc = engine.calculateRoyalties(1000, 0.004, holders, 'USD');
  assert.equal(calc.totalAmount, 4); // 1000 * 0.004
  assert.equal(calc.currency, 'USD');
  assert.equal(calc.streams, 1000);
  assert.equal(calc.splits.length, 3);
  const sumOfSplits = calc.splits.reduce((s, x) => s + x.amount, 0);
  assert.ok(Math.abs(sumOfSplits - calc.totalAmount) < 1e-9);
  // first split is 50% of the total
  assert.equal(calc.splits[0].amount, 2);
});

test('splitRoyalties distributes an amount proportionally to shares', () => {
  const engine = new RightsEngine();
  const splits = engine.splitRoyalties(100, holders);
  const total = splits.reduce((s, x) => s + x.amount, 0);
  assert.ok(Math.abs(total - 100) < 1e-9);
  assert.equal(splits[0].amount, 50);
  assert.equal(splits[1].amount, 30);
  assert.equal(splits[2].amount, 20);
});

test('splitRoyalties normalizes when shares do not sum to 100', () => {
  const engine = new RightsEngine();
  const two = [
    { id: 'a', name: 'A', role: 'owner' as const, share: 1 },
    { id: 'b', name: 'B', role: 'label' as const, share: 3 },
  ];
  const splits = engine.splitRoyalties(80, two);
  // totalShares = 4, so A gets 1/4 and B gets 3/4
  assert.equal(splits[0].amount, 20);
  assert.equal(splits[1].amount, 60);
  assert.ok(Math.abs(splits[0].amount + splits[1].amount - 80) < 1e-9);
});

test('TerritoryService and TERRITORIES expose a consistent territory set', () => {
  const svc = new TerritoryService();
  assert.ok(TERRITORIES.length > 40);
  assert.equal(svc.count, TERRITORIES.length);
  const us = svc.getTerritory('US');
  assert.ok(us);
  assert.equal(us!.name, 'United States');
  assert.equal(svc.getTerritory('ZZ'), undefined);
});

test('TerritoryService group membership works', () => {
  const svc = new TerritoryService();
  assert.ok(svc.isInGroup('US', 'WORLDWIDE'));
  assert.ok(svc.isInGroup('DE', 'EU'));
  assert.ok(!svc.isInGroup('US', 'EU'));
  const g7 = svc.getByGroup('G7');
  assert.ok(g7.length > 0);
  assert.ok(g7.every((t) => t.groups.includes('G7')));
});
