import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toSafeId,
  isValidIdString,
  sanitizeRecipe,
  sanitizeDayPlan,
  sanitizeGroceryItem,
  parseAndValidateBackupJson,
  sanitizeHttpUrl,
} from './validation.ts';
import { buildGroceryListForDates } from './groceries.ts';
import type { Recipe, ScheduleMap } from '../types/index.ts';

test('toSafeId generates strictly Firestore-safe ASCII IDs', () => {
  const id = toSafeId('Crème fraîche_c. à soupe', 'item');
  assert.equal(isValidIdString(id), true);
  assert.match(id, /^[a-zA-Z0-9_-]+$/);
});

test('sanitizeHttpUrl rejects javascript: and data: URLs', () => {
  assert.equal(sanitizeHttpUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeHttpUrl('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(sanitizeHttpUrl('https://marmiton.org/recette'), 'https://marmiton.org/recette');
});

test('sanitizeRecipe strips invalid fields, bounds oversized strings, and rejects empty title', () => {
  assert.equal(sanitizeRecipe({ title: '   ' }), null);

  const cleaned = sanitizeRecipe({
    id: '../../bad-id',
    title: 'A'.repeat(500),
    category: 'hacked',
    cuisineType: 'unknown',
    prepDuration: 'instant',
    prepMinutes: 9999,
    servings: 0,
    sourceUrl: 'javascript:alert(1)',
    ingredients: [{ name: 'Tomates', amount: 3, unit: 'pcs', category: 'legumes' }],
    steps: ['Couper les tomates'],
  });

  assert.ok(cleaned);
  assert.equal(isValidIdString(cleaned.id), true);
  assert.equal(cleaned.title.length, 200);
  assert.equal(cleaned.category, 'plat');
  assert.equal(cleaned.cuisineType, 'classique');
  assert.equal(cleaned.prepDuration, 'moyen');
  assert.equal(cleaned.prepMinutes, 600);
  assert.equal(cleaned.servings, 1);
  assert.equal(cleaned.sourceUrl, undefined);
});

test('sanitizeDayPlan rejects invalid date keys and bounds meal slots', () => {
  assert.equal(sanitizeDayPlan('not-a-date', {}), null);
  const day = sanitizeDayPlan('2026-11-12', {
    midi: { isExterior: true, exteriorLabel: 'Cantine', recipeId: 'bad/id!' },
    soir: { isExterior: false, recipeId: 'rec-1', servingsOverride: 100 },
  });
  assert.ok(day);
  assert.equal(day.midi.recipeId, undefined);
  assert.equal(day.soir.recipeId, 'rec-1');
  assert.equal(day.soir.servingsOverride, 50);
});

test('parseAndValidateBackupJson rejects malformed or empty backups and sanitizes valid ones', () => {
  assert.equal(parseAndValidateBackupJson('{invalid'), null);
  assert.equal(parseAndValidateBackupJson('[]'), null);
  assert.equal(parseAndValidateBackupJson(JSON.stringify({ recipes: [{ title: '' }] })), null);

  const valid = parseAndValidateBackupJson(
    JSON.stringify({
      recipes: [
        {
          id: 'rec-1',
          title: 'Soupe',
          category: 'plat',
          cuisineType: 'végétarien',
          prepDuration: 'rapide',
          prepMinutes: 20,
          servings: 4,
          ingredients: [],
          steps: ['Cuire'],
        },
      ],
      schedule: {
        '2026-11-12': {
          date: '2026-11-12',
          midi: { isExterior: false, recipeId: 'rec-1' },
          soir: { isExterior: true, exteriorLabel: 'Resto' },
        },
        'invalid-key': { date: 'invalid-key' },
      },
      groceryItems: [{ id: 'item-1', name: 'Sel', category: 'epicerie', checked: false }],
    })
  );

  assert.ok(valid);
  assert.equal(valid.recipes?.length, 1);
  assert.ok(valid.schedule?.['2026-11-12']);
  assert.equal(valid.schedule?.['invalid-key'], undefined);
  assert.equal(valid.groceryItems?.length, 1);
});

test('buildGroceryListForDates creates valid ASCII IDs and scales by servingsOverride', () => {
  const recipes: Recipe[] = [
    {
      id: 'rec-1',
      title: 'Gratin',
      category: 'plat',
      cuisineType: 'classique',
      prepDuration: 'moyen',
      prepMinutes: 30,
      servings: 4,
      ingredients: [
        { id: 'ing-1', name: 'Crème fraîche', amount: 200, unit: 'ml', category: 'frais' },
      ],
      steps: ['Cuire'],
      createdAt: '2026-10-01T00:00:00Z',
    },
  ];
  const schedule: ScheduleMap = {
    '2026-11-12': {
      date: '2026-11-12',
      midi: { isExterior: false, recipeId: 'rec-1', servingsOverride: 6 },
      soir: { isExterior: false },
    },
  };

  const items = buildGroceryListForDates(['2026-11-12'], schedule, recipes);
  assert.equal(items.length, 1);
  assert.equal(items[0].amount, 300);
  assert.equal(isValidIdString(items[0].id), true);
});
