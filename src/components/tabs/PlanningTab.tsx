import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { MealSlotContent, Recipe } from '../../types/index.ts';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Utensils,
  Clock,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { MealEditModal } from '../modals/MealEditModal.tsx';
import { RecipeEditModal } from '../modals/RecipeEditModal.tsx';
import { BatchPlanModal } from '../modals/BatchPlanModal.tsx';

export const PlanningTab: React.FC = () => {
  const {
    weekOffset,
    setWeekOffset,
    getWeekDatesKeys,
    schedule,
    recipes,
    updateMealSlot,
    setActiveTab,
  } = useApp();

  const [activeSlotModal, setActiveSlotModal] = useState<{
    dateKey: string;
    slot: 'midi' | 'soir';
  } | null>(null);

  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [quickPickerSlot, setQuickPickerSlot] = useState<{
    dateKey: string;
    slot: 'midi' | 'soir';
  } | null>(null);

  const recipeMap = new Map<string, Recipe>(recipes.map((r: Recipe) => [r.id, r]));

  const currentWeekDates = getWeekDatesKeys(weekOffset);

  const handleReusePastWeek = () => {
    const currentWeekKeys = getWeekDatesKeys(0);
    const pastWeekKeys = currentWeekDates;

    for (let i = 0; i < 7; i++) {
      const pastKey = pastWeekKeys[i];
      const targetKey = currentWeekKeys[i];
      const pastDay = schedule[pastKey];
      if (pastDay && targetKey) {
        updateMealSlot(targetKey, 'midi', pastDay.midi);
        updateMealSlot(targetKey, 'soir', pastDay.soir);
      }
    }
    setWeekOffset(0);
  };

  const formatHeaderWeekRange = (): string => {
    if (currentWeekDates.length === 0) return '';
    const first = new Date(currentWeekDates[0] + 'T12:00:00');
    const last = new Date(currentWeekDates[6] + 'T12:00:00');
    return `Du ${first.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })} au ${last.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  };

  const handleToggleExteriorQuick = (
    e: React.MouseEvent,
    dateKey: string,
    slot: 'midi' | 'soir',
    currentSlot: MealSlotContent
  ) => {
    e.stopPropagation();
    updateMealSlot(dateKey, slot, {
      isExterior: !currentSlot.isExterior,
      exteriorLabel: !currentSlot.isExterior
        ? slot === 'midi'
          ? 'Cantine / Travail'
          : 'Restaurant / Extérieur'
        : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Week Selector Strip (1 à 3 semaines) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#3D5A45]" />
            <h2 className="text-base font-bold text-slate-800 font-display">
              Planning des Repas
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{formatHeaderWeekRange()}</p>
        </div>

        {/* 1, 2, 3 weeks segmented tabs & Batch plan button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3D5A45] bg-[#EAF0EC] hover:bg-[#E2ECE4] border border-[#CCDCD0] rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Planifier une recette ou un repas extérieur pour une série de jours"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97D64]" />
            <span>Planifier en série</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-slate-200 rounded-xl overflow-x-auto">
            {[
              { offset: -2, label: 'Il y a 2 sem.' },
              { offset: -1, label: 'Semaine dernière' },
              { offset: 0, label: 'Semaine en cours' },
              { offset: 1, label: 'Semaine +1' },
              { offset: 2, label: 'Semaine +2' },
            ].map((w) => (
              <button
                key={w.offset}
                onClick={() => setWeekOffset(w.offset)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  weekOffset === w.offset
                    ? 'bg-white text-[#3D5A45] shadow-xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Historical banner if viewing past week */}
      {weekOffset < 0 && (
        <div className="p-4 rounded-2xl bg-[#FAF3E9] border border-[#E8DCC9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C5D33]">
          <div className="flex items-center gap-2">
            <span className="text-base">📜</span>
            <span>
              <strong>Vue Historique :</strong> Vous consultez un menu passé. Vous pouvez réutiliser l'intégralité de ce menu pour la semaine en cours.
            </span>
          </div>
          <button
            onClick={handleReusePastWeek}
            className="px-3.5 py-1.5 rounded-xl bg-[#8C5D33] text-white font-semibold hover:bg-[#784f2b] transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            Réutiliser ce menu pour cette semaine
          </button>
        </div>
      )}

      {/* Grid of Days (Lundi -> Dimanche) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
        {currentWeekDates.map((dateKey) => {
          const dateObj = new Date(dateKey + 'T12:00:00');
          const isToday =
            new Date().toLocaleDateString('fr-FR') ===
            dateObj.toLocaleDateString('fr-FR');
          const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
          const dayNum = dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          });

          const dayData = schedule[dateKey] || {
            date: dateKey,
            midi: { isExterior: false },
            soir: { isExterior: false },
          };

          return (
            <div
              key={dateKey}
              className={`flex flex-col rounded-2xl border transition-all ${
                isToday
                  ? 'bg-white border-[#3D5A45]/40 shadow-xs ring-1 ring-[#3D5A45]/20'
                  : 'bg-white/80 border-slate-200/80 hover:border-slate-300'
              } overflow-hidden`}
            >
              {/* Day Header */}
              <div
                className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
                  isToday
                    ? 'bg-[#EAF0EC] border-[#CCDCD0]'
                    : 'bg-[#FAF8F5] border-slate-100'
                }`}
              >
                <div>
                  <span className="text-xs font-bold capitalize text-slate-800 block">
                    {dayName}
                  </span>
                  <span className="text-[11px] text-slate-500">{dayNum}</span>
                </div>
                {isToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#3D5A45] text-white">
                    Aujourd'hui
                  </span>
                )}
              </div>

              {/* Meals container */}
              <div className="p-3 flex-1 flex flex-col gap-3">
                {/* Midi Slot */}
                <MealSlotCard
                  dateKey={dateKey}
                  slot="midi"
                  slotLabel="☀️ Midi"
                  data={dayData.midi}
                  recipeMap={recipeMap}
                  onOpenModal={() => setActiveSlotModal({ dateKey, slot: 'midi' })}
                  onToggleExterior={(e) =>
                    handleToggleExteriorQuick(e, dateKey, 'midi', dayData.midi)
                  }
                  onOpenQuickPicker={() => setQuickPickerSlot({ dateKey, slot: 'midi' })}
                />

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Soir Slot */}
                <MealSlotCard
                  dateKey={dateKey}
                  slot="soir"
                  slotLabel="🌙 Soir"
                  data={dayData.soir}
                  recipeMap={recipeMap}
                  onOpenModal={() => setActiveSlotModal({ dateKey, slot: 'soir' })}
                  onToggleExterior={(e) =>
                    handleToggleExteriorQuick(e, dateKey, 'soir', dayData.soir)
                  }
                  onOpenQuickPicker={() => setQuickPickerSlot({ dateKey, slot: 'soir' })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Footer Banner */}
      <div className="p-4 rounded-2xl bg-[#EAF0EC]/60 border border-[#CCDCD0]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#3D5A45]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D97D64]" />
          <span>
            Besoin d'inspiration ? Laissez le <strong>Planificateur Automatique</strong>{' '}
            composer vos repas avec une variété stricte sur 10 jours glissants.
          </span>
        </div>
        <button
          onClick={() => setActiveTab('planification')}
          className="px-3.5 py-1.5 rounded-xl bg-[#3D5A45] text-white font-semibold hover:bg-[#324b39] transition-colors whitespace-nowrap cursor-pointer shadow-xs"
        >
          Ouvrir le générateur
        </button>
      </div>

      {/* Quick Recipe Picker Modal */}
      {quickPickerSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 max-h-[85vh] flex flex-col">
            <h3 className="text-base font-bold text-slate-800 font-display mb-1">
              Choisir une recette
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Assigner instantanément au repas {quickPickerSlot.slot} du{' '}
              {new Date(quickPickerSlot.dateKey + 'T12:00:00').toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
              })}
            </p>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-4">
              {recipes.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    updateMealSlot(quickPickerSlot.dateKey, quickPickerSlot.slot, {
                      recipeId: rec.id,
                      isExterior: false,
                    });
                    setQuickPickerSlot(null);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-[#3D5A45]/30 hover:bg-[#EAF0EC]/40 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-[#3D5A45]">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {rec.prepMinutes} min · {rec.prepDuration}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#3D5A45]" />
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setQuickPickerSlot(null);
                  setIsCreatingRecipe(true);
                }}
                className="text-xs font-semibold text-[#3D5A45] hover:underline cursor-pointer"
              >
                + Nouvelle recette
              </button>
              <button
                onClick={() => setQuickPickerSlot(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Meal Edit Modal */}
      {activeSlotModal && (
        <MealEditModal
          dateKey={activeSlotModal.dateKey}
          slot={activeSlotModal.slot}
          onClose={() => setActiveSlotModal(null)}
          onOpenCreateRecipe={() => setIsCreatingRecipe(true)}
        />
      )}

      {/* Recipe Creation Modal */}
      {isCreatingRecipe && (
        <RecipeEditModal onClose={() => setIsCreatingRecipe(false)} />
      )}

      {/* Batch Planning Modal */}
      {showBatchModal && (
        <BatchPlanModal onClose={() => setShowBatchModal(false)} />
      )}
    </div>
  );
};

interface MealSlotCardProps {
  dateKey: string;
  slot: 'midi' | 'soir';
  slotLabel: string;
  data: MealSlotContent;
  recipeMap: Map<string, Recipe>;
  onOpenModal: () => void;
  onToggleExterior: (e: React.MouseEvent) => void;
  onOpenQuickPicker: () => void;
}

const MealSlotCard: React.FC<MealSlotCardProps> = ({
  slotLabel,
  data,
  recipeMap,
  onOpenModal,
  onToggleExterior,
  onOpenQuickPicker,
}) => {
  const recipe = data.recipeId ? recipeMap.get(data.recipeId) : null;
  const hasContent = data.isExterior || data.recipeId || data.customTitle;

  return (
    <div
      onClick={onOpenModal}
      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer min-h-[92px] flex flex-col justify-between ${
        data.isExterior
          ? 'bg-[#FAF3E9] border-[#E8DCC9] hover:border-[#D6C5AD]'
          : hasContent
          ? 'bg-white border-slate-200 hover:border-[#3D5A45]/40 hover:shadow-xs'
          : 'bg-[#FAF8F5]/80 border-dashed border-slate-200 hover:border-slate-300 hover:bg-white'
      }`}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {slotLabel}
        </span>
        <div className="flex items-center gap-1">
          {/* Quick exterior meal toggle icon */}
          <button
            type="button"
            onClick={onToggleExterior}
            title={
              data.isExterior
                ? 'Repas extérieur (cliquer pour basculer maison)'
                : 'Marquer repas pris à l’extérieur'
            }
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              data.isExterior
                ? 'text-[#D97D64] hover:bg-[#F3E7D7]'
                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>

          {/* Quick assign shortcut button */}
          {!data.isExterior && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQuickPicker();
              }}
              title="Choisir rapidement une recette"
              className="p-1 text-slate-300 hover:text-[#3D5A45] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slot body */}
      {data.isExterior ? (
        <div className="py-1">
          <p className="text-xs font-semibold text-[#8C5D33] line-clamp-1">
            {data.exteriorLabel || 'Extérieur'}
          </p>
          <span className="text-[10px] text-[#A67C52] inline-block mt-0.5">
            Non inclus dans les courses
          </span>
        </div>
      ) : recipe ? (
        <div>
          <p className="text-xs font-semibold text-slate-800 group-hover:text-[#3D5A45] line-clamp-2 leading-snug">
            {recipe.title}
          </p>
          {(data.entree || data.accompagnement) && (
            <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
              {data.entree && (
                <p className="truncate text-slate-600">🥗 {data.entree}</p>
              )}
              {data.accompagnement && (
                <p className="truncate text-slate-600">🍚 {data.accompagnement}</p>
              )}
            </div>
          )}
        </div>
      ) : data.customTitle ? (
        <div>
          <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
            {data.customTitle}
          </p>
          {(data.entree || data.accompagnement) && (
            <div className="mt-1 space-y-0.5 text-[10px] text-slate-500">
              {data.entree && <p className="truncate">🥗 {data.entree}</p>}
              {data.accompagnement && <p className="truncate">🍚 {data.accompagnement}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="py-2 text-center">
          <span className="text-[11px] text-slate-400 group-hover:text-[#3D5A45] font-medium transition-colors">
            + Définir un repas
          </span>
        </div>
      )}

      {/* Duration footer if recipe */}
      {recipe && !data.isExterior && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {recipe.prepMinutes}m
          </span>
          <span className="capitalize">{recipe.prepDuration}</span>
        </div>
      )}
    </div>
  );
};
