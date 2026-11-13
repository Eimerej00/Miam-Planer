import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { Recipe, PrepDuration, Ingredient } from '../../types/index.ts';
import type { ExtractedRecipeDraft } from '../../utils/recipeParser.ts';
import {
  Search,
  Plus,
  Link2,
  Clock,
  Users,
  ChefHat,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { RecipeEditModal } from '../modals/RecipeEditModal.tsx';
import { UrlImportModal } from '../modals/UrlImportModal.tsx';

interface RecipesTabProps {
  pendingImportDraft?: ExtractedRecipeDraft | null;
  onClearPendingImport?: () => void;
}

export const RecipesTab: React.FC<RecipesTabProps> = ({
  pendingImportDraft = null,
  onClearPendingImport,
}) => {
  const { recipes, deleteRecipe, updateRecipe } = useApp();

  const [search, setSearch] = useState('');
  const [filterDuration, setFilterDuration] = useState<PrepDuration | 'all'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detailServings, setDetailServings] = useState<number>(4);
  const [isCreating, setIsCreating] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [activeImportDraft, setActiveImportDraft] =
    useState<ExtractedRecipeDraft | null>(null);

  useEffect(() => {
    if (pendingImportDraft) {
      setActiveImportDraft(pendingImportDraft);
      setIsImportingUrl(true);
      onClearPendingImport?.();
    }
  }, [pendingImportDraft, onClearPendingImport]);

  const handleOpenRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setDetailServings(recipe.servings || 4);
  };

  const filtered = recipes.filter((r: Recipe) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.ingredients.some((ing: Ingredient) =>
        ing.name.toLowerCase().includes(search.toLowerCase())
      ) ||
      r.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesDuration =
      filterDuration === 'all' || r.prepDuration === filterDuration;

    return matchesSearch && matchesDuration;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800 font-display">
            Carnet de Recettes
          </h2>
          <p className="text-xs text-slate-500">
            {recipes.length} recettes familiales enregistrées
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* URL Import Button */}
          <button
            onClick={() => {
              setActiveImportDraft(null);
              setIsImportingUrl(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#8C5D33] bg-[#FAF0EC] hover:bg-[#F6E5DD] border border-[#F0D5C9] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Link2 className="w-4 h-4 text-[#D97D64]" />
            <span>Importer via URL</span>
          </button>

          {/* New Recipe Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#324b39] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle recette</span>
          </button>
        </div>
      </div>

      {/* Search & Duration Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une recette, un ingrédient..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
          />
        </div>

        {/* Duration Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'Toutes les durées' },
            { id: 'rapide', label: '⚡ Rapide (<20m)' },
            { id: 'moyen', label: '⏱ Moyen (20-45m)' },
            { id: 'long', label: '🥘 Mijoté (>45m)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterDuration(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterDuration === tab.id
                  ? 'bg-[#EAF0EC] text-[#3D5A45] font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <ChefHat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aucune recette trouvée</p>
          <p className="text-xs text-slate-400 mt-1">
            Modifiez vos filtres ou ajoutez une nouvelle recette familiale.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe: Recipe) => (
            <div
              key={recipe.id}
              onClick={() => handleOpenRecipe(recipe)}
              className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#3D5A45]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Header metadata */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {recipe.prepMinutes} min
                  </span>
                  <span
                    className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-md ${
                      recipe.prepDuration === 'rapide'
                        ? 'bg-emerald-50 text-emerald-700'
                        : recipe.prepDuration === 'moyen'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {recipe.prepDuration}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#3D5A45] transition-colors line-clamp-2 mb-2 font-display">
                  {recipe.title}
                </h3>

                {/* Ingredients preview */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                  {recipe.ingredients.map((i: Ingredient) => i.name).join(', ')}
                </p>
              </div>

              {/* Tags & servings footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {recipe.servings} pers.
                </span>
                <span className="text-slate-400">
                  {recipe.ingredients.length} ingrédients
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3D5A45] block mb-1">
                  {selectedRecipe.category} · {selectedRecipe.prepDuration}
                </span>
                <h3 className="text-xl font-bold text-slate-800 font-display">
                  {selectedRecipe.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time & Servings bar with Convives Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF8F5] text-xs text-slate-700 mb-5 border border-slate-200/80">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[#3D5A45]" />
                <strong>{selectedRecipe.prepMinutes} min</strong> de préparation
              </span>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-semibold text-[#3D5A45]">
                  <Users className="w-4 h-4" />
                  Convives :
                </span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setDetailServings(Math.max(1, detailServings - 1))}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-slate-800 tabular-nums">
                    {detailServings}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailServings(detailServings + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients with dynamic scaling */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ingrédients ({selectedRecipe.ingredients.length})
                </h4>
                {detailServings !== selectedRecipe.servings && (
                  <button
                    type="button"
                    onClick={() => {
                      const base = selectedRecipe.servings || 4;
                      const factor = detailServings / base;
                      const updatedIngs = selectedRecipe.ingredients.map((i: any) => ({
                        ...i,
                        amount: i.amount ? Number((i.amount * factor).toFixed(1)) : undefined,
                      }));
                      updateRecipe({
                        ...selectedRecipe,
                        servings: detailServings,
                        ingredients: updatedIngs,
                      });
                      setSelectedRecipe({
                        ...selectedRecipe,
                        servings: detailServings,
                        ingredients: updatedIngs,
                      });
                    }}
                    className="text-[11px] font-semibold text-[#3D5A45] hover:underline cursor-pointer"
                  >
                    Enregistrer ces proportions
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedRecipe.ingredients.map((ing: any) => {
                  const base = selectedRecipe.servings || 4;
                  const factor = detailServings / base;
                  const scaledAmount = ing.amount ? Number((ing.amount * factor).toFixed(1)) : undefined;
                  return (
                    <div key={ing.id} className="text-xs text-slate-700 flex justify-between">
                      <span>• {ing.name}</span>
                      <span className="font-mono text-slate-500">
                        {scaledAmount ? `${scaledAmount} ${ing.unit || ''}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Étapes de préparation (Process)
              </h4>
              <div className="space-y-2.5">
                {selectedRecipe.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-[#EAF0EC] text-[#3D5A45] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  deleteRecipe(selectedRecipe.id);
                  setSelectedRecipe(null);
                }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecipeToEdit(selectedRecipe);
                    setSelectedRecipe(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecipe(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#3D5A45] text-xs font-semibold text-white hover:bg-[#324b39] cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Add/Edit Modal */}
      {(isCreating || recipeToEdit) && (
        <RecipeEditModal
          recipeToEdit={recipeToEdit}
          onClose={() => {
            setIsCreating(false);
            setRecipeToEdit(null);
          }}
        />
      )}

      {/* URL & Bookmarklet Import Modal */}
      {isImportingUrl && (
        <UrlImportModal
          initialDraft={activeImportDraft}
          onClose={() => {
            setIsImportingUrl(false);
            setActiveImportDraft(null);
          }}
          onSuccess={(newRec) => {
            setIsImportingUrl(false);
            setActiveImportDraft(null);
            setSelectedRecipe(newRec);
          }}
        />
      )}
    </div>
  );
};
