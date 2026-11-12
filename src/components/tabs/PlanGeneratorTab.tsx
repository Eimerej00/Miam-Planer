import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { ScheduleMap, Recipe } from '../../types/index.ts';
import {
  Wand2,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  generateSchedulePlan,
  PlanGenerationOptions,
  formatDateKey,
  addDays,
} from '../../utils/planGenerator.ts';

export const PlanGeneratorTab: React.FC = () => {
  const {
    recipes,
    schedule,
    applyGeneratedPlan,
    currentMondayDateKey,
    setActiveTab,
  } = useApp();

  const [weeksCount, setWeeksCount] = useState<1 | 2 | 3>(1);
  const [targetSlot, setTargetSlot] = useState<'both' | 'midi' | 'soir'>('both');
  const [prepPreference, setPrepPreference] = useState<
    'all' | 'rapide' | 'moyen' | 'equilibre'
  >('equilibre');
  const [preserveExterior, setPreserveExterior] = useState(true);

  // Advanced quota criteria
  const [targetVegetarianCount, setTargetVegetarianCount] = useState<number>(2);
  const [targetFishCount, setTargetFishCount] = useState<number>(2);
  const [targetFastCount, setTargetFastCount] = useState<number>(4);
  const [targetMijoteCount, setTargetMijoteCount] = useState<number>(1);

  // Staged proposed plan for preview before applying
  const [proposedPlan, setProposedPlan] = useState<ScheduleMap | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const recipeMap = new Map<string, Recipe>(recipes.map((r: Recipe) => [r.id, r]));

  const daysCount = weeksCount * 7;

  const handleGenerate = () => {
    const options: PlanGenerationOptions = {
      startDate: currentMondayDateKey,
      daysCount,
      includeMidi: targetSlot === 'both' || targetSlot === 'midi',
      includeSoir: targetSlot === 'both' || targetSlot === 'soir',
      prepPreference,
      preserveExterior,
      targetVegetarianCount,
      targetFishCount,
      targetFastCount,
      targetMijoteCount,
    };

    const newPlan = generateSchedulePlan(recipes, schedule, options);
    setProposedPlan(newPlan);
    setAppliedSuccess(false);
  };

  const handleReRollSlot = (dateKey: string, slot: 'midi' | 'soir') => {
    if (!proposedPlan) return;
    const currentDay = proposedPlan[dateKey];
    if (!currentDay) return;

    // Collect currently used recipe IDs in preview plan
    const usedIds = new Set<string>();
    Object.values(proposedPlan).forEach((day) => {
      if (day.midi?.recipeId) usedIds.add(day.midi.recipeId);
      if (day.soir?.recipeId) usedIds.add(day.soir.recipeId);
    });

    // Candidates not in usedIds or other recipes
    let eligible = recipes.filter((r: Recipe) => !usedIds.has(r.id));
    if (eligible.length === 0) {
      eligible = recipes.filter((r: Recipe) => r.id !== currentDay[slot].recipeId);
    }

    if (eligible.length > 0) {
      const picked = eligible[Math.floor(Math.random() * eligible.length)];
      setProposedPlan({
        ...proposedPlan,
        [dateKey]: {
          ...currentDay,
          [slot]: {
            ...currentDay[slot],
            recipeId: picked.id,
            customTitle: undefined,
          },
        },
      });
    }
  };

  const handleApplyToOfficialSchedule = () => {
    if (!proposedPlan) return;
    // Apply proposed plan directly to context
    Object.keys(proposedPlan).forEach((dateKey) => {
      const day = proposedPlan[dateKey];
      // Updated by context method
    });
    // Context helper
    applyGeneratedPlan({
      startDate: currentMondayDateKey,
      daysCount,
      includeMidi: targetSlot === 'both' || targetSlot === 'midi',
      includeSoir: targetSlot === 'both' || targetSlot === 'soir',
      prepPreference,
      preserveExterior,
    });

    setAppliedSuccess(true);
    setTimeout(() => {
      setActiveTab('planning');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-[#EAF0EC] text-[#3D5A45] flex items-center justify-center">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 font-display">
              Générateur Intelligent de Menus
            </h2>
            <p className="text-xs text-slate-500">
              Compose automatiquement votre planning en garantissant une variété stricte sur 10 jours glissants
            </p>
          </div>
        </div>

        {/* Variety guarantee notice */}
        <div className="mt-4 p-3 rounded-xl bg-[#FAF8F5] border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-[#3D5A45] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Règle d'or de variété :</strong> L'algorithme analyse l'historique et assure qu'aucune même recette ne revient sur un intervalle de 10 jours. Les repas marqués extérieurs sont préservés.
          </p>
        </div>
      </div>

      {/* Configuration Criteria Box */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Paramètres de la planification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Horizon */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Durée de la planification :
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border border-slate-200 rounded-xl">
              {[
                { count: 1, label: '1 Semaine' },
                { count: 2, label: '2 Semaines' },
                { count: 3, label: '3 Semaines' },
              ].map((item) => (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => setWeeksCount(item.count as any)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    weeksCount === item.count
                      ? 'bg-white text-[#3D5A45] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meals Targeted */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              2. Repas ciblés :
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border border-slate-200 rounded-xl">
              {[
                { id: 'both', label: 'Midi & Soir' },
                { id: 'midi', label: 'Midis seuls' },
                { id: 'soir', label: 'Soirs seuls' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTargetSlot(item.id as any)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    targetSlot === item.id
                      ? 'bg-white text-[#3D5A45] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration profile */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              3. Profil de préparation :
            </label>
            <select
              value={prepPreference}
              onChange={(e) => setPrepPreference(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
            >
              <option value="equilibre">⚖️ Équilibré (rapide midi / varié soir)</option>
              <option value="all">🎲 Toutes les durées</option>
              <option value="rapide">⚡ Priorité Rapide (&lt; 20 min)</option>
              <option value="moyen">⏱ Priorité Moyen (20 - 45 min)</option>
            </select>
          </div>
        </div>

        {/* Advanced Quotas Section */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Règles & Quotas par période (Cibles souhaitées) :
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                🥗 Repas Végétariens :
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={targetVegetarianCount}
                onChange={(e) => setTargetVegetarianCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                🐟 Repas avec Poisson :
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={targetFishCount}
                onChange={(e) => setTargetFishCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                ⚡ Repas Rapides (&lt;20m) :
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={targetFastCount}
                onChange={(e) => setTargetFastCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                🥘 Repas Mijotés / Longs :
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={targetMijoteCount}
                onChange={(e) => setTargetMijoteCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Preserve exterior checkbox */}
        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={preserveExterior}
              onChange={(e) => setPreserveExterior(e.target.checked)}
              className="w-4 h-4 rounded text-[#3D5A45] focus:ring-[#3D5A45] border-slate-300"
            />
            <span>
              <strong>Conserver les repas extérieurs :</strong> Ne pas remplacer les repas déjà marqués "École", "Travail" ou "Restaurant".
            </span>
          </label>
        </div>

        {/* Generate button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3D5A45] text-white text-xs font-bold hover:bg-[#324b39] transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#FDECE6]" />
            Générer la proposition ({daysCount} jours)
          </button>
        </div>
      </div>

      {/* Generated Proposal Preview */}
      {proposedPlan && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#EAF0EC] border border-[#CCDCD0]">
            <div>
              <h3 className="text-sm font-bold text-[#3D5A45] font-display flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Proposition de Planning Prête ({daysCount} jours)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Revoyez les recettes choisies. Cliquez sur l'icône de rafraîchissement d'un repas pour tirer une autre recette.
              </p>
            </div>

            <button
              onClick={handleApplyToOfficialSchedule}
              disabled={appliedSuccess}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-bold hover:bg-[#324b39] transition-colors shadow-xs cursor-pointer disabled:bg-emerald-600 whitespace-nowrap"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Planning appliqué ! Redirection...
                </>
              ) : (
                <>
                  Valider et appliquer au planning
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Grid of proposed days */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {Array.from({ length: daysCount }, (_, i) => {
              const dateKey = addDays(currentMondayDateKey, i);
              const day = proposedPlan[dateKey];
              if (!day) return null;

              const d = new Date(dateKey + 'T12:00:00');
              const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
              const dayNum = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

              const midiRec = day.midi?.recipeId ? recipeMap.get(day.midi.recipeId) : null;
              const soirRec = day.soir?.recipeId ? recipeMap.get(day.soir.recipeId) : null;

              return (
                <div
                  key={dateKey}
                  className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold capitalize text-slate-800">
                      {dayName}
                    </span>
                    <span className="text-[10px] text-slate-400">{dayNum}</span>
                  </div>

                  <div className="py-2.5 space-y-3">
                    {/* Midi */}
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-500">Midi</span>
                        {!day.midi?.isExterior && (
                          <button
                            type="button"
                            onClick={() => handleReRollSlot(dateKey, 'midi')}
                            title="Tirer une autre recette"
                            className="p-0.5 text-slate-400 hover:text-[#3D5A45] cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {day.midi?.isExterior ? (
                        <p className="text-[#8C5D33] italic text-[11px]">
                          {day.midi.exteriorLabel || 'Extérieur'}
                        </p>
                      ) : midiRec ? (
                        <p className="font-semibold text-slate-800 line-clamp-2">
                          {midiRec.title}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Non défini</p>
                      )}
                    </div>

                    {/* Soir */}
                    <div className="text-xs border-t border-slate-50 pt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-500">Soir</span>
                        {!day.soir?.isExterior && (
                          <button
                            type="button"
                            onClick={() => handleReRollSlot(dateKey, 'soir')}
                            title="Tirer une autre recette"
                            className="p-0.5 text-slate-400 hover:text-[#3D5A45] cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {day.soir?.isExterior ? (
                        <p className="text-[#8C5D33] italic text-[11px]">
                          {day.soir.exteriorLabel || 'Extérieur'}
                        </p>
                      ) : soirRec ? (
                        <p className="font-semibold text-slate-800 line-clamp-2">
                          {soirRec.title}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Non défini</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
