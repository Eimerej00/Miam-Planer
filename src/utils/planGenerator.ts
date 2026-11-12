import type { Recipe, ScheduleMap, DayPlan, PrepDuration } from '../types/index.ts';

export interface PlanGenerationOptions {
  startDate: string; // YYYY-MM-DD
  daysCount: number; // e.g. 7, 14, 21
  includeMidi: boolean;
  includeSoir: boolean;
  prepPreference: 'all' | 'rapide' | 'moyen' | 'equilibre';
  preserveExterior: boolean;
  targetVegetarianCount?: number;
  targetFishCount?: number;
  targetFastCount?: number;
  targetMijoteCount?: number;
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(dateStr: string, offset: number): string {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + offset);
  return formatDateKey(d);
}

export function isRecipeVegetarian(r: Recipe): boolean {
  const tags = (r.tags || []).map((t) => t.toLowerCase());
  return (
    tags.some((t) => t.includes('végétarien') || t.includes('veggie') || t.includes('légumineuses')) ||
    r.title.toLowerCase().includes('curry') ||
    r.title.toLowerCase().includes('dahl')
  );
}

export function isRecipeFish(r: Recipe): boolean {
  const tags = (r.tags || []).map((t) => t.toLowerCase());
  return (
    tags.some((t) => t.includes('poisson')) ||
    r.title.toLowerCase().includes('saumon') ||
    r.title.toLowerCase().includes('cabillaud')
  );
}

export function isRecipeFast(r: Recipe): boolean {
  return r.prepDuration === 'rapide' || r.prepMinutes <= 20;
}

export function isRecipeMijote(r: Recipe): boolean {
  const tags = (r.tags || []).map((t) => t.toLowerCase());
  return (
    tags.some((t) => t.includes('mijoté') || t.includes('hiver') || t.includes('tradition')) ||
    r.prepDuration === 'long' ||
    r.prepMinutes >= 45
  );
}

/**
 * Returns a list of recipe IDs used between [date - windowDays, date]
 */
export function getRecentlyUsedRecipeIds(
  schedule: ScheduleMap,
  targetDate: string,
  windowDays: number = 10
): Set<string> {
  const used = new Set<string>();
  const target = parseDateKey(targetDate);

  for (let i = 1; i <= windowDays; i++) {
    const pastDate = new Date(target);
    pastDate.setDate(pastDate.getDate() - i);
    const key = formatDateKey(pastDate);

    const day = schedule[key];
    if (day) {
      if (day.midi?.recipeId) used.add(day.midi.recipeId);
      if (day.soir?.recipeId) used.add(day.soir.recipeId);
    }
  }

  const currentDay = schedule[targetDate];
  if (currentDay) {
    if (currentDay.midi?.recipeId) used.add(currentDay.midi.recipeId);
    if (currentDay.soir?.recipeId) used.add(currentDay.soir.recipeId);
  }

  return used;
}

/**
 * Core smart planner enforcing the 10-day sliding window variety rule and quota criteria
 */
export function generateSchedulePlan(
  recipes: Recipe[],
  existingSchedule: ScheduleMap,
  options: PlanGenerationOptions
): ScheduleMap {
  if (!recipes || recipes.length === 0) {
    return existingSchedule;
  }

  const newSchedule: ScheduleMap = { ...existingSchedule };

  const lastUsedMap: Record<string, number> = {};
  recipes.forEach((r, idx) => {
    lastUsedMap[r.id] = -999 + idx;
  });

  // Track assigned quotas during this run
  let assignedVeg = 0;
  let assignedFish = 0;
  let assignedFast = 0;
  let assignedMijote = 0;

  for (let dayIdx = 0; dayIdx < options.daysCount; dayIdx++) {
    const currentDate = addDays(options.startDate, dayIdx);
    const existingDay: DayPlan = newSchedule[currentDate] || {
      date: currentDate,
      midi: { isExterior: false },
      soir: { isExterior: false },
    };

    const slotsToFill: ('midi' | 'soir')[] = [];
    if (options.includeMidi) slotsToFill.push('midi');
    if (options.includeSoir) slotsToFill.push('soir');

    const updatedMidi = { ...existingDay.midi };
    const updatedSoir = { ...existingDay.soir };

    for (const slot of slotsToFill) {
      const currentSlot = slot === 'midi' ? updatedMidi : updatedSoir;

      if (options.preserveExterior && currentSlot.isExterior) {
        continue;
      }

      const usedInWindow = getRecentlyUsedRecipeIds(newSchedule, currentDate, 10);

      let candidateRecipes = recipes.filter((r) => {
        if (options.prepPreference === 'rapide') return r.prepDuration === 'rapide';
        if (options.prepPreference === 'moyen') return r.prepDuration === 'moyen';
        if (options.prepPreference === 'equilibre') {
          const d = parseDateKey(currentDate);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          if (slot === 'midi') return r.prepDuration === 'rapide' || r.prepDuration === 'moyen';
          if (!isWeekend) return r.prepDuration !== 'long';
          return true;
        }
        return true;
      });

      if (candidateRecipes.length === 0) {
        candidateRecipes = recipes;
      }

      let eligible = candidateRecipes.filter((r) => !usedInWindow.has(r.id));
      if (eligible.length === 0) {
        eligible = [...candidateRecipes];
      }

      // Sort eligible recipes to prioritize quota targets if needed + least recently used
      eligible.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Quota bonuses if targets not yet met
        if (options.targetVegetarianCount !== undefined && assignedVeg < options.targetVegetarianCount) {
          if (isRecipeVegetarian(a)) scoreA += 5;
          if (isRecipeVegetarian(b)) scoreB += 5;
        }
        if (options.targetFishCount !== undefined && assignedFish < options.targetFishCount) {
          if (isRecipeFish(a)) scoreA += 5;
          if (isRecipeFish(b)) scoreB += 5;
        }
        if (options.targetFastCount !== undefined && assignedFast < options.targetFastCount) {
          if (isRecipeFast(a)) scoreA += 5;
          if (isRecipeFast(b)) scoreB += 5;
        }
        if (options.targetMijoteCount !== undefined && assignedMijote < options.targetMijoteCount) {
          if (isRecipeMijote(a)) scoreA += 5;
          if (isRecipeMijote(b)) scoreB += 5;
        }

        const lastA = lastUsedMap[a.id] ?? -999;
        const lastB = lastUsedMap[b.id] ?? -999;

        // Higher score first, then least recently used (lowest lastUsed)
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return lastA - lastB;
      });

      const chosen = eligible[0];
      if (chosen) {
        currentSlot.recipeId = chosen.id;
        currentSlot.customTitle = undefined;
        lastUsedMap[chosen.id] = dayIdx;

        if (isRecipeVegetarian(chosen)) assignedVeg++;
        if (isRecipeFish(chosen)) assignedFish++;
        if (isRecipeFast(chosen)) assignedFast++;
        if (isRecipeMijote(chosen)) assignedMijote++;
      }
    }

    newSchedule[currentDate] = {
      date: currentDate,
      midi: updatedMidi,
      soir: updatedSoir,
    };
  }

  return newSchedule;
}
