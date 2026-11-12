import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedulePlan, getRecentlyUsedRecipeIds } from './planGenerator.ts';
import type { PlanGenerationOptions } from './planGenerator.ts';
import type { Recipe, ScheduleMap } from '../types/index.ts';

const mockRecipes: Recipe[] = Array.from({ length: 15 }, (_, i) => ({
  id: `rec-${i + 1}`,
  title: `Recette ${i + 1}`,
  category: 'plat',
  prepDuration: i % 3 === 0 ? 'rapide' : i % 3 === 1 ? 'moyen' : 'long',
  prepMinutes: 15 + i * 5,
  servings: 4,
  ingredients: [
    { id: `ing-${i}-1`, name: 'Pâtes', amount: 200, unit: 'g', category: 'epicerie' },
  ],
  steps: ['Étape 1'],
  createdAt: new Date().toISOString(),
}));

test('getRecentlyUsedRecipeIds detects recipes in 10-day sliding window', () => {
  const schedule: ScheduleMap = {
    '2026-10-10': {
      date: '2026-10-10',
      midi: { isExterior: false, recipeId: 'rec-1' },
      soir: { isExterior: false, recipeId: 'rec-2' },
    },
  };

  const usedAt15th = getRecentlyUsedRecipeIds(schedule, '2026-10-15', 10);
  assert.equal(usedAt15th.has('rec-1'), true);
  assert.equal(usedAt15th.has('rec-2'), true);
  assert.equal(usedAt15th.has('rec-3'), false);

  const usedAt25th = getRecentlyUsedRecipeIds(schedule, '2026-10-25', 10);
  assert.equal(usedAt25th.has('rec-1'), false);
});

test('generateSchedulePlan enforces 10-day variety across schedule', () => {
  const options: PlanGenerationOptions = {
    startDate: '2026-10-15',
    daysCount: 7,
    includeMidi: true,
    includeSoir: true,
    prepPreference: 'all',
    preserveExterior: true,
  };

  const schedule = generateSchedulePlan(mockRecipes, {}, options);

  // Check that all 7 days have meals
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 9, 15 + i);
    const key = `2026-10-${String(15 + i).padStart(2, '0')}`;
    assert.ok(schedule[key], `Schedule should contain ${key}`);
    assert.ok(schedule[key].midi.recipeId, `Midi recipe should be assigned for ${key}`);
    assert.ok(schedule[key].soir.recipeId, `Soir recipe should be assigned for ${key}`);
  }

  // Ensure no recipe is repeated within 10 days
  const usedOrder: { date: string; slot: string; id: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const key = `2026-10-${String(15 + i).padStart(2, '0')}`;
    usedOrder.push({ date: key, slot: 'midi', id: schedule[key].midi.recipeId! });
    usedOrder.push({ date: key, slot: 'soir', id: schedule[key].soir.recipeId! });
  }

  const ids = usedOrder.map((u) => u.id);
  const uniqueCount = new Set(ids).size;
  // With 15 recipes and 14 meal slots, all 14 should be completely unique!
  assert.equal(uniqueCount, 14, 'All 14 meal slots over 7 days should have unique recipes when 15 recipes exist');
});

test('generateSchedulePlan respects exterior meals', () => {
  const initialSchedule: ScheduleMap = {
    '2026-10-15': {
      date: '2026-10-15',
      midi: { isExterior: true, exteriorLabel: 'Cantine' },
      soir: { isExterior: false },
    },
  };

  const options: PlanGenerationOptions = {
    startDate: '2026-10-15',
    daysCount: 1,
    includeMidi: true,
    includeSoir: true,
    prepPreference: 'all',
    preserveExterior: true,
  };

  const schedule = generateSchedulePlan(mockRecipes, initialSchedule, options);
  assert.equal(schedule['2026-10-15'].midi.isExterior, true);
  assert.equal(schedule['2026-10-15'].midi.exteriorLabel, 'Cantine');
  assert.ok(schedule['2026-10-15'].soir.recipeId);
});
