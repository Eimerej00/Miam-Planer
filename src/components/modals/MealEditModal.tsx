import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { MealSlotContent, Recipe } from '../../types/index.ts';
import { X, UtensilsCrossed, Plus, Trash2, MapPin } from 'lucide-react';

interface MealEditModalProps {
  dateKey: string;
  slot: 'midi' | 'soir';
  onClose: () => void;
  onOpenCreateRecipe: () => void;
}

export const MealEditModal: React.FC<MealEditModalProps> = ({
  dateKey,
  slot,
  onClose,
  onOpenCreateRecipe,
}) => {
  const { schedule, recipes, updateMealSlot } = useApp();

  const currentDay = schedule[dateKey];
  const initialContent: MealSlotContent = currentDay
    ? currentDay[slot] || { isExterior: false }
    : { isExterior: false };

  const [isExterior, setIsExterior] = useState(initialContent.isExterior);
  const [exteriorLabel, setExteriorLabel] = useState(
    initialContent.exteriorLabel || 'École / Cantine'
  );
  const [recipeId, setRecipeId] = useState<string>(initialContent.recipeId || '');
  const [customTitle, setCustomTitle] = useState(initialContent.customTitle || '');
  const [entree, setEntree] = useState(initialContent.entree || '');
  const [accompagnement, setAccompagnement] = useState(
    initialContent.accompagnement || ''
  );
  const [servingsOverride, setServingsOverride] = useState(
    initialContent.servingsOverride
  );

  const formattedDate = new Date(dateKey + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleSave = () => {
    updateMealSlot(dateKey, slot, {
      isExterior,
      exteriorLabel: isExterior ? exteriorLabel : undefined,
      recipeId: !isExterior && recipeId ? recipeId : undefined,
      customTitle: !isExterior && !recipeId ? customTitle.trim() || undefined : undefined,
      entree: !isExterior ? entree.trim() || undefined : undefined,
      accompagnement: !isExterior ? accompagnement.trim() || undefined : undefined,
      servingsOverride: !isExterior ? servingsOverride : undefined,
    });
    onClose();
  };

  const handleClear = () => {
    updateMealSlot(dateKey, slot, {
      isExterior: false,
      recipeId: undefined,
      customTitle: undefined,
      entree: undefined,
      accompagnement: undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-display capitalize">
              {slot === 'midi' ? '☀️ Repas du Midi' : '🌙 Repas du Soir'}
            </h3>
            <p className="text-xs text-slate-500 capitalize">{formattedDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Checkbox Exterior Meal */}
        <div className="mb-5 p-3.5 rounded-xl bg-[#FAF8F5] border border-slate-200/80">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isExterior}
              onChange={(e) => setIsExterior(e.target.checked)}
              className="w-4 h-4 rounded text-[#3D5A45] focus:ring-[#3D5A45] border-slate-300"
            />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#D97D64]" />
              <span className="text-sm font-semibold text-slate-800">
                Repas pris à l'extérieur
              </span>
            </div>
          </label>

          {isExterior && (
            <div className="mt-3 pl-7">
              <label className="block text-xs text-slate-500 mb-1">
                Lieu ou occasion :
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['École / Cantine', 'Déjeuner travail', 'Restaurant', 'Invitation'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setExteriorLabel(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        exteriorLabel === tag
                          ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
              <input
                type="text"
                value={exteriorLabel}
                onChange={(e) => setExteriorLabel(e.target.value)}
                placeholder="Autre lieu..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>
          )}
        </div>

        {/* Home meal options */}
        {!isExterior && (
          <div className="space-y-4">
            {/* Main recipe selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Plat principal (recette) :
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateRecipe();
                  }}
                  className="text-xs font-semibold text-[#3D5A45] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer une nouvelle recette
                </button>
              </div>

              <select
                value={recipeId}
                onChange={(e) => {
                  setRecipeId(e.target.value);
                  if (e.target.value) setCustomTitle('');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              >
                <option value="">-- Choisir une recette du catalogue --</option>
                {recipes.map((r: Recipe) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.prepMinutes} min · {r.prepDuration})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom title if no recipe selected */}
            {!recipeId && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Ou saisie libre d'un plat :
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex : Omelette aux fines herbes, restes de la veille..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <span className="text-xs font-bold text-slate-500">
                Options facultatives du repas :
              </span>

              {/* Entrée */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  🥗 Entrée (optionnel) :
                </label>
                <input
                  type="text"
                  value={entree}
                  onChange={(e) => setEntree(e.target.value)}
                  placeholder="Ex : Salade de carottes râpées, potage de légumes..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>

              {/* Accompagnement */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  🍚 Accompagnement (optionnel) :
                </label>
                <input
                  type="text"
                  value={accompagnement}
                  onChange={(e) => setAccompagnement(e.target.value)}
                  placeholder="Ex : Riz basmati, salade verte, haricots verts..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>

              {/* Servings Override */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  👥 Nombre de convives :
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={servingsOverride ?? ''}
                  onChange={(e) => setServingsOverride(Number(e.target.value) || undefined)}
                  placeholder="Laisser vide pour utiliser la valeur de la recette"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-5">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 py-1.5 px-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vider ce créneau
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
