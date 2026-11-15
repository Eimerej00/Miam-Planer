import type { Recipe, ScheduleMap } from '../types/index.ts';
import { formatDateKey } from '../utils/planGenerator.ts';
import { FAMILY_CATALOG_RECIPES, LEGACY_SAMPLE_RECIPE_IDS } from './familyRecipes.ts';

export { LEGACY_SAMPLE_RECIPE_IDS };

export const INITIAL_RECIPES: Recipe[] = FAMILY_CATALOG_RECIPES;

export function getInitialSchedule(): ScheduleMap {
  const schedule: ScheduleMap = {};
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));

  interface SampleSlot {
    midi?: string;
    soir?: string;
    midiExt?: boolean;
    midiLabel?: string;
    soirExt?: boolean;
    soirLabel?: string;
    midiEntree?: string;
    midiAccomp?: string;
    soirEntree?: string;
    soirAccomp?: string;
  }

  const sampleAssignments: SampleSlot[] = [
    { midi: 'fam-01', soir: 'fam-03', midiEntree: 'Carottes râpées citronnées' },
    { midi: 'fam-38', soir: 'fam-05', soirAccomp: 'Salade verte croquante' },
    { midiExt: true, midiLabel: 'Cantine scolaire', soir: 'fam-18' },
    { midi: 'fam-39', soir: 'fam-06', midiAccomp: 'Riz basmati' },
    { midi: 'fam-22', soirExt: true, soirLabel: 'Pizzeria en famille' },
    { midi: 'fam-02', soir: 'fam-09', midiEntree: 'Velouté de potimarron' },
    { midi: 'fam-34', soir: 'fam-21', midiAccomp: 'Salade verte' },
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatDateKey(d);
    const sample = sampleAssignments[i];

    schedule[key] = {
      date: key,
      midi: {
        isExterior: !!sample.midiExt,
        exteriorLabel: sample.midiLabel,
        recipeId: sample.midi,
        entree: sample.midiEntree,
        accompagnement: sample.midiAccomp,
      },
      soir: {
        isExterior: !!sample.soirExt,
        exteriorLabel: sample.soirLabel,
        recipeId: sample.soir,
        entree: sample.soirEntree,
        accompagnement: sample.soirAccomp,
      },
    };
  }

  return schedule;
}
