import type { GroceryCategory, PrepDuration, RecipeCategory } from '../types/index.ts';
import {
  type ExtractedRecipeDraft,
  inferCuisineType,
  inferDurationBucket,
  parseRecipeFromHtml,
  parseRecipeFromText,
  titleFromUrlSlug,
  validateClientHttpUrl,
} from './recipeParser.ts';
import { toSafeId } from './validation.ts';

export interface ImportRecipeResult {
  ok: true;
  draft: ExtractedRecipeDraft;
}

export interface ImportRecipeFailure {
  ok: false;
  error: string;
  blockedByRemote?: boolean;
  suggestedTitle?: string;
  cleanUrl?: string;
}

async function tryServerAiExtraction(
  url?: string,
  rawText?: string
): Promise<ExtractedRecipeDraft | null> {
  try {
    const res = await fetch('/api/extract-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        url: url || undefined,
        rawContent: rawText || undefined,
      }),
    });

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const data = await res.json();
    if (!data || typeof data.title !== 'string' || !data.title.trim()) {
      return null;
    }

    const prepMinutes =
      typeof data.prepMinutes === 'number' && Number.isFinite(data.prepMinutes)
        ? Math.min(600, Math.max(1, Math.round(data.prepMinutes)))
        : 25;

    const ingredients = Array.isArray(data.ingredients)
      ? data.ingredients.map((ing: Record<string, unknown>, idx: number) => ({
          id: toSafeId(`${String(ing?.name || 'ing')}-${idx}`, 'ing'),
          name: typeof ing?.name === 'string' && ing.name.trim() ? ing.name.trim() : 'Ingrédient',
          amount:
            typeof ing?.amount === 'number' && Number.isFinite(ing.amount)
              ? ing.amount
              : undefined,
          unit: typeof ing?.unit === 'string' ? ing.unit.trim() : '',
          category: (typeof ing?.category === 'string'
            ? ing.category
            : 'epicerie') as GroceryCategory,
        }))
      : [];

    const steps = Array.isArray(data.steps)
      ? data.steps.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];

    const tags =
      Array.isArray(data.tags) && data.tags.length > 0
        ? data.tags.filter((t: unknown): t is string => typeof t === 'string')
        : ['importé'];

    return {
      title: data.title.trim(),
      category: (data.category as RecipeCategory) || 'plat',
      cuisineType: inferCuisineType(data.title, ingredients, tags, prepMinutes),
      prepDuration: (data.prepDuration as PrepDuration) || inferDurationBucket(prepMinutes),
      prepMinutes,
      servings:
        typeof data.servings === 'number' && Number.isFinite(data.servings)
          ? Math.min(50, Math.max(1, Math.round(data.servings)))
          : 4,
      ingredients,
      steps,
      tags,
      sourceUrl: url,
      extractionMethod: 'ai',
    };
  } catch {
    return null;
  }
}

async function fetchHtmlViaAllOrigins(targetUrl: string): Promise<ExtractedRecipeDraft | null> {
  try {
    const res = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      { signal: AbortSignal.timeout(5500) }
    );
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 200) return null;
    return parseRecipeFromHtml(html, targetUrl);
  } catch {
    return null;
  }
}

async function fetchMarkdownViaJina(targetUrl: string): Promise<ExtractedRecipeDraft | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${targetUrl}`, {
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 100) return null;
    // Detect Jina explicit error pages such as HTTP 410/403 anti-bot walls
    if (/Warning:\s*Target URL returned error\s*(?:403|410|429|5\d\d)/i.test(text)) {
      const parsedAnyway = parseRecipeFromText(text, targetUrl);
      if (parsedAnyway && (parsedAnyway.ingredients.length >= 2 || parsedAnyway.steps.length >= 2)) {
        return parsedAnyway;
      }
      return null;
    }
    return parseRecipeFromText(text, targetUrl);
  } catch {
    return null;
  }
}

export async function importRecipeFromInputs(params: {
  url?: string;
  rawText?: string;
}): Promise<ImportRecipeResult | ImportRecipeFailure> {
  const rawUrl = params.url?.trim() || '';
  const rawText = params.rawText?.trim() || '';

  let cleanUrl: string | undefined;
  if (rawUrl) {
    const validated = validateClientHttpUrl(rawUrl);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    cleanUrl = validated.url;
  }

  if (!cleanUrl && !rawText) {
    return {
      ok: false,
      error: 'Veuillez renseigner une URL de recette ou coller le texte.',
    };
  }

  // 1. Prefer local server AI extraction if /api/extract-recipe is active
  const aiDraft = await tryServerAiExtraction(cleanUrl, rawText || undefined);
  if (aiDraft) {
    return { ok: true, draft: aiDraft };
  }

  // 2. If user pasted recipe text/HTML directly, parse locally in the browser
  if (rawText) {
    const fromPasted = /<(?:script|html|body|div)\b/i.test(rawText)
      ? parseRecipeFromHtml(rawText, cleanUrl)
      : parseRecipeFromText(rawText, cleanUrl);

    if (fromPasted) {
      return { ok: true, draft: fromPasted };
    }

    if (!cleanUrl) {
      return {
        ok: false,
        error:
          "Impossible d'identifier les ingrédients ou les étapes dans ce texte. Copiez l'ensemble de la recette (titre, ingrédients, préparation).",
      };
    }
  }

  // 3. Static browser extraction for GitHub Pages (Schema.org JSON-LD + Reader Markdown)
  if (cleanUrl) {
    const [htmlRes, jinaRes] = await Promise.allSettled([
      fetchHtmlViaAllOrigins(cleanUrl),
      fetchMarkdownViaJina(cleanUrl),
    ]);

    const htmlDraft = htmlRes.status === 'fulfilled' ? htmlRes.value : null;
    const jinaDraft = jinaRes.status === 'fulfilled' ? jinaRes.value : null;

    if (htmlDraft && htmlDraft.extractionMethod === 'json-ld') {
      return { ok: true, draft: htmlDraft };
    }
    if (jinaDraft && (jinaDraft.ingredients.length > 0 || jinaDraft.steps.length > 0)) {
      return { ok: true, draft: jinaDraft };
    }
    if (htmlDraft) {
      return { ok: true, draft: htmlDraft };
    }

    return {
      ok: false,
      blockedByRemote: true,
      suggestedTitle: titleFromUrlSlug(cleanUrl),
      cleanUrl,
      error:
        "Ce site bloque l'accès automatique à distance (protection anti-bot). Utilisez le bouton Favori rapide depuis l'onglet de la recette, collez le texte copié ci-dessous, ou créez un brouillon pré-rempli.",
    };
  }

  return {
    ok: false,
    error: "Impossible d'importer cette recette.",
  };
}
