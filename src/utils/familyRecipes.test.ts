import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILY_CATALOG_RECIPES, LEGACY_SAMPLE_RECIPE_IDS } from '../data/familyRecipes.ts';
import { INITIAL_RECIPES, getInitialSchedule } from '../data/mockData.ts';
import { isValidIdString, sanitizeRecipe } from './validation.ts';

test('FAMILY_CATALOG_RECIPES exports 45 complete and Firestore-valid recipes', () => {
  assert.equal(FAMILY_CATALOG_RECIPES.length, 45);
  assert.equal(INITIAL_RECIPES.length, 45);

  const seenIds = new Set<string>();
  const legacySet = new Set(LEGACY_SAMPLE_RECIPE_IDS);

  for (const recipe of FAMILY_CATALOG_RECIPES) {
    assert.equal(isValidIdString(recipe.id), true, `Invalid ID: ${recipe.id}`);
    assert.equal(seenIds.has(recipe.id), false, `Duplicate ID: ${recipe.id}`);
    assert.equal(legacySet.has(recipe.id), false, `Legacy ID conflict: ${recipe.id}`);
    seenIds.add(recipe.id);

    assert.ok(recipe.ingredients.length >= 3, `${recipe.id} should have >= 3 ingredients`);
    assert.ok(recipe.steps.length >= 3, `${recipe.id} should have >= 3 steps`);

    const ingIds = new Set<string>();
    for (const ing of recipe.ingredients) {
      assert.equal(isValidIdString(ing.id), true, `Invalid ingredient ID: ${ing.id}`);
      assert.equal(ingIds.has(ing.id), false, `Duplicate ingredient ID: ${ing.id}`);
      ingIds.add(ing.id);
    }

    const sanitized = sanitizeRecipe(recipe);
    assert.ok(sanitized, `sanitizeRecipe failed for ${recipe.id}`);
    assert.equal(sanitized.id, recipe.id);
    assert.equal(sanitized.title, recipe.title);
    assert.equal(sanitized.category, recipe.category);
    assert.equal(sanitized.cuisineType, recipe.cuisineType);
    assert.equal(sanitized.prepDuration, recipe.prepDuration);
    assert.equal(sanitized.prepMinutes, recipe.prepMinutes);
    assert.equal(sanitized.ingredients.length, recipe.ingredients.length);
    assert.equal(sanitized.steps.length, recipe.steps.length);
  }
});

test('getInitialSchedule references only valid recipe IDs from FAMILY_CATALOG_RECIPES', () => {
  const validIds = new Set(FAMILY_CATALOG_RECIPES.map((r) => r.id));
  const schedule = getInitialSchedule();
  const entries = Object.values(schedule);
  assert.equal(entries.length, 7);

  for (const day of entries) {
    if (day.midi.recipeId) {
      assert.equal(
        validIds.has(day.midi.recipeId),
        true,
        `Invalid midi recipeId ${day.midi.recipeId} on ${day.date}`
      );
    }
    if (day.soir.recipeId) {
      assert.equal(
        validIds.has(day.soir.recipeId),
        true,
        `Invalid soir recipeId ${day.soir.recipeId} on ${day.date}`
      );
    }
  }
});
