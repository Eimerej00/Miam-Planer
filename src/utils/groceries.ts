import type { GroceryItem, GroceryCategory, ScheduleMap, Recipe } from '../types/index.ts';
import { toSafeId } from './validation.ts';

export const CATEGORY_LABELS: Record<GroceryCategory, { label: string; icon: string }> = {
  legumes: { label: 'Fruits & Légumes', icon: '🥕' },
  viandes: { label: 'Boucherie & Poissonnerie', icon: '🥩' },
  frais: { label: 'Produits Frais & Crèmerie', icon: '🧀' },
  epicerie: { label: 'Épicerie & Féculents', icon: '🌾' },
  surgeles: { label: 'Surgelés', icon: '❄️' },
  autres: { label: 'Divers & Entretien', icon: '🛒' },
};

export function buildGroceryListForDates(
  selectedDates: string[],
  schedule: ScheduleMap,
  recipes: Recipe[],
  existingItems: GroceryItem[] = []
): GroceryItem[] {
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  // Map to aggregate ingredients: normalized name + unit -> GroceryItem
  const aggregated = new Map<string, GroceryItem>();

  // Preserve existing checked states
  const checkedMap = new Map<string, boolean>();
  existingItems.forEach((item) => {
    checkedMap.set(`${item.name.toLowerCase()}_${item.unit || ''}`, item.checked);
  });

  // Preserve custom items
  const customItems = existingItems.filter((it) => it.isCustom);

  for (const dateKey of selectedDates) {
    const day = schedule[dateKey];
    if (!day) continue;

    const slots = [
      { slot: day.midi, name: 'Midi' },
      { slot: day.soir, name: 'Soir' },
    ];

    for (const { slot, name: slotName } of slots) {
      if (!slot || slot.isExterior) continue;

      if (slot.recipeId && recipeMap.has(slot.recipeId)) {
        const recipe = recipeMap.get(slot.recipeId)!;
        for (const ing of recipe.ingredients) {
          const normName = ing.name.trim();
          const unit = (ing.unit || '').trim().toLowerCase();
          const key = `${normName.toLowerCase()}_${unit}`;
          
          // Calculate scaled amount
          const baseServings = recipe.servings > 0 ? recipe.servings : 4;
          const servings = slot.servingsOverride || baseServings;
          const scale = servings / baseServings;
          const amountToUse = ing.amount ? Math.round(ing.amount * scale * 100) / 100 : undefined;

          if (aggregated.has(key)) {
            const current = aggregated.get(key)!;
            if (amountToUse && current.amount) {
              current.amount = Math.round((current.amount + amountToUse) * 100) / 100;
            }
          } else {
            const isChecked = checkedMap.get(key) || false;
            aggregated.set(key, {
              id: toSafeId(key, 'item'),
              name: normName,
              amount: amountToUse,
              unit: ing.unit,
              category: ing.category || 'autres',
              checked: isChecked,
              sourceMeal: recipe.title,
            });
          }
        }
      }
    }
  }

  const generatedList = Array.from(aggregated.values());
  return [...generatedList, ...customItems];
}

export function formatGroceriesForExport(items: GroceryItem[]): string {
  const byCategory: Partial<Record<GroceryCategory, GroceryItem[]>> = {};

  items.forEach((item) => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category]!.push(item);
  });

  let output = `🛒 LISTE DE COURSES - MIAM PLANNER\n`;
  output += `Générée le ${new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })}\n\n`;

  (Object.keys(CATEGORY_LABELS) as GroceryCategory[]).forEach((cat) => {
    const list = byCategory[cat];
    if (list && list.length > 0) {
      output += `${CATEGORY_LABELS[cat].icon} ${CATEGORY_LABELS[cat].label.toUpperCase()}\n`;
      list.forEach((it) => {
        const amountStr = it.amount ? `${it.amount} ${it.unit || ''}`.trim() : '';
        const checkMark = it.checked ? ' [FAIT]' : ' [ ]';
        output += `${checkMark} ${it.name}${amountStr ? ` (${amountStr})` : ''}\n`;
      });
      output += '\n';
    }
  });

  return output;
}
