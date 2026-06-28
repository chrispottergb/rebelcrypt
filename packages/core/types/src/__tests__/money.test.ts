import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  money,
  moneyFromMajor,
  addMoney,
  subtractMoney,
  currencyCode,
  fractionDigits,
} from '@music-ai/types';

test('money constructs from integer minor units', () => {
  const m = money(1099, 'USD');
  assert.equal(m.amountMinor, 1099);
  assert.equal(m.currency, 'USD');
});

test('money rejects non-integer minor units and bad currency codes', () => {
  assert.throws(() => money(10.5, 'USD'), /must be an integer/);
  assert.throws(() => currencyCode('usd'), /Invalid ISO-4217/);
  assert.throws(() => currencyCode('US'), /Invalid ISO-4217/);
});

test('moneyFromMajor scales by currency fraction digits', () => {
  // USD has 2 fraction digits -> 10.99 dollars = 1099 cents
  assert.equal(moneyFromMajor(10.99, 'USD').amountMinor, 1099);
  // JPY has 0 fraction digits -> 500 yen = 500 minor units
  assert.equal(moneyFromMajor(500, 'JPY').amountMinor, 500);
  assert.equal(fractionDigits('JPY'), 0);
  assert.equal(fractionDigits('USD'), 2);
});

test('addMoney and subtractMoney operate on same-currency values', () => {
  const a = money(1000, 'EUR');
  const b = money(250, 'EUR');
  assert.equal(addMoney(a, b).amountMinor, 1250);
  assert.equal(subtractMoney(a, b).amountMinor, 750);
  // result preserves currency
  assert.equal(addMoney(a, b).currency, 'EUR');
  // subtraction can go negative
  assert.equal(subtractMoney(b, a).amountMinor, -750);
});

test('arithmetic across currencies throws a mismatch error', () => {
  const usd = money(100, 'USD');
  const eur = money(100, 'EUR');
  assert.throws(() => addMoney(usd, eur), /Currency mismatch/);
  assert.throws(() => subtractMoney(usd, eur), /Currency mismatch/);
});
