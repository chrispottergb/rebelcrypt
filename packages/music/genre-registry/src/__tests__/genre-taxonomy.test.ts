import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenreTaxonomy } from '@music-ai/genre-registry';

test('getAllGenres returns a non-trivial list', () => {
  const tax = new GenreTaxonomy();
  const all = tax.getAllGenres();
  assert.ok(Array.isArray(all));
  assert.ok(all.length > 30);
  assert.equal(all.length, tax.count);
  // every genre has a stable id and name
  assert.ok(all.every((g) => typeof g.id === 'string' && g.id.length > 0));
});

test('getGenre looks up by id and returns undefined for unknown', () => {
  const tax = new GenreTaxonomy();
  const rock = tax.getGenre('rock');
  assert.ok(rock);
  assert.equal(rock!.name, 'Rock');
  assert.equal(rock!.parent, null);
  assert.equal(tax.getGenre('does-not-exist'), undefined);
});

test('getSubgenres returns subgenre slugs, empty for unknown id', () => {
  const tax = new GenreTaxonomy();
  const subs = tax.getSubgenres('rock');
  assert.ok(subs.length > 0);
  assert.ok(subs.includes('grunge'));
  assert.deepEqual(tax.getSubgenres('nope'), []);
});

test('searchGenres finds by name and description', () => {
  const tax = new GenreTaxonomy();
  const byName = tax.searchGenres('jazz');
  assert.ok(byName.some((g) => g.id === 'jazz'));
  // case-insensitive
  assert.ok(tax.searchGenres('ROCK').some((g) => g.id === 'rock'));
  // a query matching nothing yields an empty array
  assert.deepEqual(tax.searchGenres('zzzzz-no-match'), []);
});

test('getRootGenres returns only top-level genres (parent === null)', () => {
  const tax = new GenreTaxonomy();
  const roots = tax.getRootGenres();
  assert.ok(roots.length > 0);
  assert.ok(roots.every((g) => g.parent === null));
  // ambient has a parent ("electronic") so it must not be a root
  assert.ok(!roots.some((g) => g.id === 'ambient'));
  // roots are a subset of all genres
  assert.ok(roots.length < tax.getAllGenres().length);
});
