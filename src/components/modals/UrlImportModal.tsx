import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type {
  PrepDuration,
  Recipe,
  RecipeCategory,
} from '../../types/index.ts';
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Globe,
  Link2,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  buildBookmarkletHref,
  draftToRecipeInput,
  type ExtractedRecipeDraft,
} from '../../utils/recipeParser.ts';
import { importRecipeFromInputs } from '../../utils/recipeImportClient.ts';

interface UrlImportModalProps {
  onClose: () => void;
  onSuccess: (recipe: Recipe) => void;
  initialDraft?: ExtractedRecipeDraft | null;
}

const METHOD_LABELS: Record<ExtractedRecipeDraft['extractionMethod'], string> = {
  ai: 'Analyse IA',
  'json-ld': 'Données structurées de la page',
  text: 'Extraction automatique',
  html: 'Lecture de la page',
  bookmarklet: 'Importé via favori navigateur',
};

export const UrlImportModal: React.FC<UrlImportModalProps> = ({
  onClose,
  onSuccess,
  initialDraft = null,
}) => {
  const { addRecipe } = useApp();

  const [url, setUrl] = useState(initialDraft?.sourceUrl || '');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedFallback, setBlockedFallback] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [preview, setPreview] = useState<ExtractedRecipeDraft | null>(initialDraft);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const bookmarkletAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const bookmarkletHref = useMemo(() => {
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://eimerej00.github.io/';
    return buildBookmarkletHref(baseUrl);
  }, []);

  useEffect(() => {
    if (showBookmarklet && bookmarkletAnchorRef.current) {
      bookmarkletAnchorRef.current.setAttribute('href', bookmarkletHref);
    }
  }, [showBookmarklet, bookmarkletHref]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !rawText.trim()) {
      setError('Veuillez renseigner une URL de recette ou coller le texte.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBlockedFallback(null);

    try {
      const result = await importRecipeFromInputs({
        url: url.trim() || undefined,
        rawText: rawText.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        if (result.blockedByRemote && result.suggestedTitle && result.cleanUrl) {
          setBlockedFallback({
            title: result.suggestedTitle,
            url: result.cleanUrl,
          });
        }
        return;
      }

      setPreview(result.draft);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Erreur inattendue lors de l'importation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraftFromBlocked = () => {
    if (!blockedFallback) return;
    setPreview({
      title: blockedFallback.title,
      category: 'plat',
      cuisineType: 'classique',
      prepDuration: 'moyen',
      prepMinutes: 25,
      servings: 4,
      ingredients: [],
      steps: [],
      tags: ['importé'],
      sourceUrl: blockedFallback.url,
      extractionMethod: 'text',
    });
    setError(null);
    setBlockedFallback(null);
  };

  const handleCopyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopiedBookmarklet(true);
      window.setTimeout(() => setCopiedBookmarklet(false), 2500);
    } catch {
      setError('Impossible de copier automatiquement. Glissez le bouton dans votre barre de favoris.');
    }
  };

  const handleConfirmAdd = () => {
    if (!preview || !preview.title.trim()) return;
    const saved = addRecipe(draftToRecipeInput(preview));
    onSuccess(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0EC] text-[#D97D64] flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-display">
                Importer une recette
              </h3>
              <p className="text-xs text-slate-500">
                Par lien web, texte copié ou favori navigateur — sans serveur requis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
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
                  type="text"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.marmiton.org/recettes/recette_..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Extrait automatiquement le titre, la durée, les ingrédients et les étapes.
              </p>
            </div>

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">
                ET / OU
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Coller le texte copié de la recette :
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  'Collez ici le texte de la recette (Ctrl+A puis Ctrl+C sur le site), ou tapez :\nTarte aux pommes : 3 pommes, 1 pâte brisée, 50 g sucre. Étapes : 1. Préchauffer le four...'
                }
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Fonctionne instantanément même sur les sites protégés contre l'accès automatique.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <p>{error}</p>
                {blockedFallback && (
                  <button
                    type="button"
                    onClick={handleCreateDraftFromBlocked}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-800 font-semibold hover:bg-red-100/60 transition-colors cursor-pointer"
                  >
                    Créer un brouillon « {blockedFallback.title} »
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Collapsible 1-click Bookmarklet helper */}
            <div className="rounded-xl border border-slate-200 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setShowBookmarklet((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100/60 rounded-xl transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-[#D97D64]" />
                  Astuce 1-clic : Favori navigateur (compatible avec tous les sites)
                </span>
                {showBookmarklet ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showBookmarklet && (
                <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-slate-600 space-y-2.5 border-t border-slate-200/70">
                  <p className="leading-relaxed">
                    Glissez le bouton ci-dessous dans la barre de favoris de votre navigateur (ou
                    copiez le lien dans un nouveau favori). Quand vous consultez une recette sur
                    n'importe quel site (750g, Marmiton, CuisineAZ...), cliquez simplement sur ce
                    favori pour l'importer ici en 1 clic !
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      ref={bookmarkletAnchorRef}
                      href="#bookmarklet"
                      onClick={(e) => e.preventDefault()}
                      draggable
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5A45] text-white font-semibold shadow-xs cursor-grab active:cursor-grabbing select-none"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      + Miam Planner
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyBookmarklet}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedBookmarklet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copier le code du favori
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                    Extraction en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Importer la recette
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Preview and confirmation */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#EAF0EC] border border-[#CCDCD0]">
              <div className="flex items-center justify-between gap-2 text-[#3D5A45] text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Recette prête à être ajoutée !
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/80 text-[#3D5A45]">
                  {METHOD_LABELS[preview.extractionMethod]}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Vérifiez les informations ci-dessous puis enregistrez dans votre carnet familial.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Titre :</label>
              <input
                type="text"
                value={preview.title}
                onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                className="w-full px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Catégorie :</label>
                <select
                  value={preview.category}
                  onChange={(e) =>
                    setPreview({ ...preview, category: e.target.value as RecipeCategory })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="plat">Plat</option>
                  <option value="entree">Entrée</option>
                  <option value="accompagnement">Accompagnement</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Durée :</label>
                <select
                  value={preview.prepDuration}
                  onChange={(e) =>
                    setPreview({ ...preview, prepDuration: e.target.value as PrepDuration })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="rapide">Rapide (&lt; 20m)</option>
                  <option value="moyen">Moyen (20-45m)</option>
                  <option value="long">Long (&gt; 45m)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Minutes :</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={preview.prepMinutes}
                  onChange={(e) =>
                    setPreview({
                      ...preview,
                      prepMinutes: Math.max(1, Number(e.target.value) || 25),
                    })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Personnes :</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={preview.servings}
                  onChange={(e) =>
                    setPreview({
                      ...preview,
                      servings: Math.max(1, Number(e.target.value) || 4),
                    })
                  }
                  className="w-full p-1.5 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Ingredients preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ingrédients ({preview.ingredients.length}) :
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1">
                {preview.ingredients.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Aucun ingrédient détecté — vous pourrez les ajouter ensuite avec « Modifier ».
                  </p>
                ) : (
                  preview.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex justify-between gap-2 text-xs text-slate-700">
                      <span>• {ing.name}</span>
                      <span className="font-mono text-slate-500 shrink-0">
                        {ing.amount ? `${ing.amount} ${ing.unit || ''}` : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Steps preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Étapes ({preview.steps.length}) :
              </label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto space-y-1 text-xs text-slate-600">
                {preview.steps.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Aucune étape détectée — vous pourrez les compléter avec « Modifier ».
                  </p>
                ) : (
                  preview.steps.map((step, idx) => (
                    <p key={idx}>
                      <strong className="text-slate-800">{idx + 1}.</strong> {step}
                    </p>
                  ))
                )}
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
                  disabled={!preview.title.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-60"
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
