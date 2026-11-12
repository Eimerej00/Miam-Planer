export type PrepDuration = 'rapide' | 'moyen' | 'long';

export type RecipeCategory = 'plat' | 'entree' | 'accompagnement';

export type RecipeCuisine = 'classique' | 'végétarien' | 'poisson' | 'convivial' | 'rapide' | 'healthy';

export type GroceryCategory =
  | 'legumes'
  | 'viandes'
  | 'frais'
  | 'epicerie'
  | 'surgeles'
  | 'autres';

export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category: GroceryCategory;
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  cuisineType: RecipeCuisine;
  prepDuration: PrepDuration;
  prepMinutes: number;
  servings: number; // Base servings
  ingredients: Ingredient[];
  steps: string[];
  imageUrl?: string;
  imageHint?: string;
  tags?: string[];
  sourceUrl?: string;
  createdAt: string;
}

export interface MealSlotContent {
  isExterior: boolean;
  exteriorLabel?: string;
  recipeId?: string | null;
  customTitle?: string;
  entree?: string;
  accompagnement?: string;
  notes?: string;
  servingsOverride?: number; // Custom number of guests
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  midi: MealSlotContent;
  soir: MealSlotContent;
}

export type ScheduleMap = Record<string, DayPlan>; // dateKey -> DayPlan

export interface GroceryItem {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category: GroceryCategory;
  checked: boolean;
  sourceMeal?: string;
  isCustom?: boolean;
}

export type ActiveTab = 'planning' | 'recettes' | 'planification' | 'courses' | 'historique';
