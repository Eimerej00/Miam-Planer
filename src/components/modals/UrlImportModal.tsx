import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { Recipe, PrepDuration, RecipeCategory, Ingredient, GroceryCategory } from '../../types/index.ts';
import { X, Sparkles, Globe, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface UrlImportModalProps {
  onClose: () => void;
  onSuccess: (recipe: Recipe) => void;
}

export const UrlImportModal: React.FC<UrlImportModalProps> = ({ onClose, onSuccess }) => {
  const { addRecipe } = useApp();

  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted preview state
  const [preview, setPreview] = useState<Partial<Recipe> | null>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !rawText.trim()) {
      setError('Veuillez renseigner au moins une URL ou un extrait de texte.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim() || undefined,
          rawContent: rawText.trim() || undefined,
        }),
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 405) {
          throw new Error(
            "L'import automatique par URL nécessite un serveur actif (indisponible sur l'hébergement statique GitHub Pages). Vous pouvez ajouter la recette manuellement."
          );
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      if (!data.title) {
        throw new Error("L'IA n'a pas pu identifier une recette valide dans ce contenu.");
      }

      setPreview({
        title: data.title,
        category: (data.category as RecipeCategory) || 'plat',
        prepDuration: (data.prepDuration as PrepDuration) || 'moyen',
        prepMinutes: data.prepMinutes || 25,
        servings: data.servings || 4,
        ingredients: Array.isArray(data.ingredients)
          ? data.ingredients.map((ing: any, idx: number) => ({
              id: `ing-extracted-${idx}`,
              name: ing.name || 'Ingrédient',
              amount: ing.amount,
              unit: ing.unit || '',
              category: (ing.category as GroceryCategory) || 'epicerie',
            }))
          : [],
        steps: Array.isArray(data.steps) ? data.steps : [],
        tags: Array.isArray(data.tags) ? data.tags : ['importé'],
        sourceUrl: url.trim() || undefined,
      });
    } catch (err: unknown) {
      console.error('Extraction error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!preview || !preview.title) return;

    const saved = addRecipe({
      title: preview.title,
      category: preview.category || 'plat',
      cuisineType: 'classique',
      prepDuration: preview.prepDuration || 'moyen',
      prepMinutes: preview.prepMinutes || 25,
      servings: preview.servings || 4,
      ingredients: preview.ingredients || [],
      steps: preview.steps || [],
      tags: preview.tags || ['importé'],
      sourceUrl: preview.sourceUrl,
    });

    onSuccess(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0EC] text-[#D97D64] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-display">
                Importation Intelligente de Recette
              </h3>
              <p className="text-xs text-slate-500">
                Extraction assistée par IA Gemini depuis un site ou un texte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!preview ? (
          <form onSubmit={handleExtract} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lien web de la recette (URL) :
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.marmiton.org/recettes/recette_..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Compatible Marmiton, 750g, Cuisine AZ, blogs culinaires, etc.
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">
                OU
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Coller directement un texte de recette :
              </label>
              <textarea
                rows={3}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Ex : Tarte aux pommes : 3 pommes, 1 pâte brisée, 50g sucre... Étapes : 1. Préchauffer le four..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyse et extraction en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyser avec l'IA
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Preview and confirmation */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#EAF0EC] border border-[#CCDCD0]">
              <div className="flex items-center gap-2 text-[#3D5A45] text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Recette extraite avec succès ! Vérifiez et ajustez si besoin :
              </div>
              <p className="text-[11px] text-slate-600">
                Vous pouvez modifier le titre, vérifier la liste des ingrédients et valider son intégration à votre carnet.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Titre :</label>
              <input
                type="text"
                value={preview.title || ''}
                onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                className="w-full px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Durée :</label>
                <select
                  value={preview.prepDuration || 'moyen'}
                  onChange={(e) =>
                    setPreview({ ...preview, prepDuration: e.target.value as PrepDuration })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="rapide">Rapide (&lt; 20 min)</option>
                  <option value="moyen">Moyen (20 - 45 min)</option>
                  <option value="long">Long (&gt; 45 min)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Minutes :</label>
                <input
                  type="number"
                  value={preview.prepMinutes || 25}
                  onChange={(e) =>
                    setPreview({ ...preview, prepMinutes: Number(e.target.value) })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Ingredients preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ingrédients ({preview.ingredients?.length || 0}) :
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1">
                {preview.ingredients?.map((ing, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-700">
                    <span>• {ing.name}</span>
                    <span className="font-mono text-slate-500">
                      {ing.amount ? `${ing.amount} ${ing.unit || ''}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Étapes ({preview.steps?.length || 0}) :
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto space-y-1 text-xs text-slate-600">
                {preview.steps?.map((step, idx) => (
                  <p key={idx}>
                    <strong className="text-slate-800">{idx + 1}.</strong> {step}
                  </p>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Recommencer
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Ajouter au carnet
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
