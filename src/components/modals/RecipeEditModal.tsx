import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type {
  Recipe,
  PrepDuration,
  RecipeCategory,
  RecipeCuisine,
  GroceryCategory,
  Ingredient,
} from '../../types/index.ts';
import { X, Plus, Trash2, Clock, ChefHat } from 'lucide-react';

interface RecipeEditModalProps {
  recipeToEdit?: Recipe | null;
  onClose: () => void;
}

export const RecipeEditModal: React.FC<RecipeEditModalProps> = ({
  recipeToEdit,
  onClose,
}) => {
  const { addRecipe, updateRecipe } = useApp();

  const [title, setTitle] = useState(recipeToEdit?.title || '');
  const [category, setCategory] = useState<RecipeCategory>(
    recipeToEdit?.category || 'plat'
  );
  const [cuisineType, setCuisineType] = useState<RecipeCuisine>(
    recipeToEdit?.cuisineType || 'classique'
  );
  const [prepDuration, setPrepDuration] = useState<PrepDuration>(
    recipeToEdit?.prepDuration || 'rapide'
  );
  const [prepMinutes, setPrepMinutes] = useState<number>(
    recipeToEdit?.prepMinutes || 25
  );
  const [servings, setServings] = useState<number>(recipeToEdit?.servings || 4);

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipeToEdit?.ingredients || [
      { id: 'ing-1', name: '', amount: undefined, unit: '', category: 'legumes' },
    ]
  );

  const [steps, setSteps] = useState<string[]>(
    recipeToEdit?.steps || ['']
  );

  const [tagInput, setTagInput] = useState(recipeToEdit?.tags?.join(', ') || '');

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: '',
        amount: undefined,
        unit: '',
        category: 'epicerie',
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof Ingredient,
    val: unknown
  ) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, '']);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? val : s)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanedIngredients = ingredients
      .filter((ing) => ing.name.trim().length > 0)
      .map((ing) => ({
        ...ing,
        name: ing.name.trim(),
        unit: ing.unit?.trim(),
      }));

    const cleanedSteps = steps
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const tags = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (recipeToEdit) {
      updateRecipe({
        ...recipeToEdit,
        title: title.trim(),
        category,
        cuisineType,
        prepDuration,
        prepMinutes: Number(prepMinutes) || 20,
        servings: Number(servings) || 4,
        ingredients: cleanedIngredients,
        steps: cleanedSteps,
        tags,
      });
    } else {
      addRecipe({
        title: title.trim(),
        category,
        cuisineType,
        prepDuration,
        prepMinutes: Number(prepMinutes) || 20,
        servings: Number(servings) || 4,
        ingredients: cleanedIngredients,
        steps: cleanedSteps,
        tags,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAF0EC] text-[#3D5A45] flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display">
              {recipeToEdit ? 'Modifier la recette' : 'Ajouter une recette'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom de la recette *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Gratin dauphinois traditionnel"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
            />
          </div>

          {/* Type, Duration & Servings */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Catégorie :
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RecipeCategory)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              >
                <option value="plat">Plat principal</option>
                <option value="entree">Entrée</option>
                <option value="accompagnement">Accompagnement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cuisine :
              </label>
              <select
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value as RecipeCuisine)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              >
                <option value="classique">Classique</option>
                <option value="végétarien">Végétarien</option>
                <option value="poisson">Poisson</option>
                <option value="convivial">Convivial</option>
                <option value="rapide">Rapide</option>
                <option value="healthy">Healthy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Rythme / Durée :
              </label>
              <select
                value={prepDuration}
                onChange={(e) => setPrepDuration(e.target.value as PrepDuration)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              >
                <option value="rapide">Rapide (&lt; 20 min)</option>
                <option value="moyen">Moyen (20 - 45 min)</option>
                <option value="long">Mijoté / Long (&gt; 45 min)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Convives (base) :
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Temps total (min) :
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>
          </div>

          {/* Ingredients list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Ingrédients pour la liste de courses :
              </label>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="text-xs text-[#3D5A45] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un ingrédient
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                    placeholder="Nom (ex : Courgettes)"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={ing.amount ?? ''}
                    onChange={(e) =>
                      handleUpdateIngredient(
                        idx,
                        'amount',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Qté"
                    className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                  />
                  <input
                    type="text"
                    value={ing.unit ?? ''}
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    placeholder="Unité (g, cl, pcs)"
                    className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                  />
                  <select
                    value={ing.category}
                    onChange={(e) =>
                      handleUpdateIngredient(idx, 'category', e.target.value as GroceryCategory)
                    }
                    className="w-24 px-1.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                  >
                    <option value="legumes">Légumes</option>
                    <option value="viandes">Boucherie</option>
                    <option value="frais">Frais</option>
                    <option value="epicerie">Épicerie</option>
                    <option value="surgeles">Surgelés</option>
                    <option value="autres">Autres</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Étapes de préparation (Process) :
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs text-[#3D5A45] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une étape
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-400 mt-2 shrink-0">
                    {idx + 1}.
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    placeholder={`Étape ${idx + 1}...`}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags & Categorization presets */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Catégorisation & Mots-clés (tags) :
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['végétarien', 'poisson', 'rapide', 'mijoté', 'familial', 'healthy', 'réconfort'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const currentTags = tagInput
                      .split(',')
                      .map((t) => t.trim().toLowerCase())
                      .filter((t) => t.length > 0);
                    if (!currentTags.includes(preset)) {
                      setTagInput([...currentTags, preset].join(', '));
                    }
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-slate-200 text-slate-700 hover:bg-[#EAF0EC] hover:border-[#CCDCD0] transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Ex : familial, végétarien, poisson, rapide..."
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {recipeToEdit ? 'Enregistrer les modifications' : 'Créer la fiche recette'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
