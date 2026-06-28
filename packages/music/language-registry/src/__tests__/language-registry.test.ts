import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LanguageRegistry } from '@music-ai/language-registry';

test('getAllLanguages returns a non-trivial list matching count', () => {
  const reg = new LanguageRegistry();
  const all = reg.getAllLanguages();
  assert.ok(all.length > 50);
  assert.equal(all.length, reg.count);
  assert.ok(all.every((l) => typeof l.code === 'string' && l.code.length > 0));
});

test('getLanguage looks up by code and returns undefined for unknown', () => {
  const reg = new LanguageRegistry();
  const en = reg.getLanguage('en');
  assert.ok(en);
  assert.equal(en!.name, 'English');
  assert.equal(en!.script, 'Latn');
  assert.equal(reg.getLanguage('xx'), undefined);
});

test('searchLanguages finds by name, native name, and exact code', () => {
  const reg = new LanguageRegistry();
  assert.ok(reg.searchLanguages('spanish').some((l) => l.code === 'es'));
  // native name match
  assert.ok(reg.searchLanguages('Español').some((l) => l.code === 'es'));
  // code is matched only on exact equality
  assert.ok(reg.searchLanguages('ja').some((l) => l.code === 'ja'));
  assert.deepEqual(reg.searchLanguages('not-a-language'), []);
});

test('getByRegion filters by region substring (case-insensitive)', () => {
  const reg = new LanguageRegistry();
  const eastAsia = reg.getByRegion('East Asia');
  assert.ok(eastAsia.length > 0);
  assert.ok(eastAsia.some((l) => l.code === 'ja'));
  assert.ok(eastAsia.every((l) => l.region.toLowerCase().includes('east asia')));
  assert.deepEqual(reg.getByRegion('Atlantis'), []);
});
