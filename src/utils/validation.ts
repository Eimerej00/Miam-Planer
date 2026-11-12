import type {
  Recipe,
  RecipeCategory,
  RecipeCuisine,
  PrepDuration,
  DayPlan,
  MealSlotContent,
  GroceryItem,
  GroceryCategory,
  Ingredient,
  ScheduleMap,
} from '../types/index.ts';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_DATE_KEY_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const VALID_RECIPE_CATEGORIES: readonly RecipeCategory[] = ['plat', 'entree', 'accompagnement'];
const VALID_CUISINE_TYPES: readonly RecipeCuisine[] = [
  'classique',
  'végétarien',
  'poisson',
  'convivial',
  'rapide',
  'healthy',
];
const VALID_PREP_DURATIONS: readonly PrepDuration[] = ['rapide', 'moyen', 'long'];
const VALID_GROCERY_CATEGORIES: readonly GroceryCategory[] = [
  'legumes',
  'viandes',
  'frais',
  'epicerie',
  'surgeles',
  'autres',
];

export function toSafeId(raw: string, prefix = 'id'): string {
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  if (!ascii) {
    return `${prefix}-${Date.now().toString(36)}`;
  }
  const combined = `${prefix}-${ascii}`.slice(0, 128);
  return VALID_ID_REGEX.test(combined) ? combined : `${prefix}-${Date.now().toString(36)}`;
}

export function isValidIdString(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

export function isValidDateKeyString(key: unknown): key is string {
  return typeof key === 'string' && key.length === 10 && VALID_DATE_KEY_REGEX.test(key);
}

function clampString(val: unknown, maxLen: number): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function clampNumber(val: unknown, min: number, max: number): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.min(max, Math.max(min, val));
}

export function sanitizeHttpUrl(url: unknown, maxLen = 1000): string | undefined {
  const str = clampString(url, maxLen);
  if (!str) return undefined;
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString().slice(0, maxLen);
  } catch {
    return undefined;
  }
}

export function sanitizeIngredient(raw: unknown, idx = 0): Ingredient | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = clampString(obj.name, 150);
  if (!name) return null;

  const id = isValidIdString(obj.id) ? obj.id : toSafeId(`${name}-${idx}`, 'ing');
  const category = VALID_GROCERY_CATEGORIES.includes(obj.category as GroceryCategory)
    ? (obj.category as GroceryCategory)
    : 'autres';

  const result: Ingredient = {
    id,
    name,
    category,
  };

  const amount = clampNumber(obj.amount, 0, 100000);
  if (amount !== undefined) result.amount = amount;

  const unit = clampString(obj.unit, 40);
  if (unit !== undefined) result.unit = unit;

  return result;
}

export function sanitizeRecipe(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = clampString(obj.title, 200);
  if (!title) return null;

  const id = isValidIdString(obj.id) ? obj.id : toSafeId(title, 'rec');
  const category = VALID_RECIPE_CATEGORIES.includes(obj.category as RecipeCategory)
    ? (obj.category as RecipeCategory)
    : 'plat';
  const cuisineType = VALID_CUISINE_TYPES.includes(obj.cuisineType as RecipeCuisine)
    ? (obj.cuisineType as RecipeCuisine)
    : 'classique';
  const prepDuration = VALID_PREP_DURATIONS.includes(obj.prepDuration as PrepDuration)
    ? (obj.prepDuration as PrepDuration)
    : 'moyen';

  const prepMinutes = Math.round(clampNumber(obj.prepMinutes, 1, 600) ?? 25);
  const servings = Math.round(clampNumber(obj.servings, 1, 50) ?? 4);

  const rawIngredients = Array.isArray(obj.ingredients) ? obj.ingredients.slice(0, 50) : [];
  const ingredients = rawIngredients
    .map((ing, idx) => sanitizeIngredient(ing, idx))
    .filter((x): x is Ingredient => x !== null);

  const rawSteps = Array.isArray(obj.steps) ? obj.steps.slice(0, 40) : [];
  const steps = rawSteps
    .map((s) => clampString(s, 2000))
    .filter((x): x is string => x !== undefined);

  const rawTags = Array.isArray(obj.tags) ? obj.tags.slice(0, 15) : undefined;
  const tags = rawTags
    ? rawTags.map((t) => clampString(t, 50)).filter((x): x is string => x !== undefined)
    : undefined;

  const recipe: Recipe = {
    id,
    title,
    category,
    cuisineType,
    prepDuration,
    prepMinutes,
    servings,
    ingredients,
    steps,
    createdAt:
      typeof obj.createdAt === 'string' && obj.createdAt.length <= 64
        ? obj.createdAt
        : new Date().toISOString(),
  };

  if (tags && tags.length > 0) recipe.tags = tags;
  const imageUrl = sanitizeHttpUrl(obj.imageUrl, 1000);
  if (imageUrl) recipe.imageUrl = imageUrl;
  const imageHint = clampString(obj.imageHint, 200);
  if (imageHint) recipe.imageHint = imageHint;
  const sourceUrl = sanitizeHttpUrl(obj.sourceUrl, 1000);
  if (sourceUrl) recipe.sourceUrl = sourceUrl;

  return recipe;
}

export function sanitizeMealSlot(raw: unknown): MealSlotContent {
  if (!raw || typeof raw !== 'object') {
    return { isExterior: false };
  }
  const obj = raw as Record<string, unknown>;
  const slot: MealSlotContent = {
    isExterior: Boolean(obj.isExterior),
  };

  const exteriorLabel = clampString(obj.exteriorLabel, 200);
  if (exteriorLabel) slot.exteriorLabel = exteriorLabel;

  if (isValidIdString(obj.recipeId)) {
    slot.recipeId = obj.recipeId;
  }

  const customTitle = clampString(obj.customTitle, 200);
  if (customTitle) slot.customTitle = customTitle;

  const entree = clampString(obj.entree, 200);
  if (entree) slot.entree = entree;

  const accompagnement = clampString(obj.accompagnement, 200);
  if (accompagnement) slot.accompagnement = accompagnement;

  const notes = clampString(obj.notes, 500);
  if (notes) slot.notes = notes;

  const servingsOverride = clampNumber(obj.servingsOverride, 1, 50);
  if (servingsOverride !== undefined) slot.servingsOverride = Math.round(servingsOverride);

  return slot;
}

export function sanitizeDayPlan(dateKey: string, raw: unknown): DayPlan | null {
  if (!isValidDateKeyString(dateKey)) return null;
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  return {
    date: dateKey,
    midi: sanitizeMealSlot(obj.midi),
    soir: sanitizeMealSlot(obj.soir),
  };
}

export function sanitizeGroceryItem(raw: unknown): GroceryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const name = clampString(obj.name, 150);
  if (!name) return null;

  const id = isValidIdString(obj.id) ? obj.id : toSafeId(name, 'item');
  const category = VALID_GROCERY_CATEGORIES.includes(obj.category as GroceryCategory)
    ? (obj.category as GroceryCategory)
    : 'autres';

  const item: GroceryItem = {
    id,
    name,
    category,
    checked: Boolean(obj.checked),
  };

  const amount = clampNumber(obj.amount, 0, 100000);
  if (amount !== undefined) item.amount = amount;

  const unit = clampString(obj.unit, 40);
  if (unit) item.unit = unit;

  const sourceMeal = clampString(obj.sourceMeal, 200);
  if (sourceMeal) item.sourceMeal = sourceMeal;

  if (typeof obj.isCustom === 'boolean') item.isCustom = obj.isCustom;

  return item;
}

export interface ValidatedBackupPayload {
  recipes?: Recipe[];
  schedule?: ScheduleMap;
  groceryItems?: GroceryItem[];
}

export function parseAndValidateBackupJson(jsonStr: string): ValidatedBackupPayload | null {
  if (typeof jsonStr !== 'string' || jsonStr.length === 0 || jsonStr.length > 2_000_000) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  const result: ValidatedBackupPayload = {};

  if (Array.isArray(obj.recipes)) {
    const validRecipes = obj.recipes
      .slice(0, 500)
      .map((r) => sanitizeRecipe(r))
      .filter((r): r is Recipe => r !== null);
    if (obj.recipes.length > 0 && validRecipes.length === 0) {
      return null;
    }
    result.recipes = validRecipes;
  }

  if (obj.schedule && typeof obj.schedule === 'object' && !Array.isArray(obj.schedule)) {
    const entries = Object.entries(obj.schedule as Record<string, unknown>).slice(0, 365);
    const validSchedule: ScheduleMap = {};
    for (const [dateKey, dayVal] of entries) {
      const cleanDay = sanitizeDayPlan(dateKey, dayVal);
      if (cleanDay) {
        validSchedule[dateKey] = cleanDay;
      }
    }
    result.schedule = validSchedule;
  }

  if (Array.isArray(obj.groceryItems)) {
    result.groceryItems = obj.groceryItems
      .slice(0, 500)
      .map((g) => sanitizeGroceryItem(g))
      .filter((g): g is GroceryItem => g !== null);
  }

  if (
    result.recipes === undefined &&
    result.schedule === undefined &&
    result.groceryItems === undefined
  ) {
    return null;
  }

  return result;
}
