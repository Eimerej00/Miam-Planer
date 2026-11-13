import type {
  GroceryCategory,
  Ingredient,
  PrepDuration,
  Recipe,
  RecipeCategory,
  RecipeCuisine,
} from '../types/index.ts';
import { sanitizeHttpUrl, toSafeId } from './validation.ts';

export interface ExtractedRecipeDraft {
  title: string;
  category: RecipeCategory;
  cuisineType: RecipeCuisine;
  prepDuration: PrepDuration;
  prepMinutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  sourceUrl?: string;
  imageUrl?: string;
  extractionMethod: 'json-ld' | 'text' | 'html' | 'bookmarklet' | 'ai';
}

export interface BookmarkletTransferPayload {
  v: 1;
  url?: string;
  title?: string;
  jsonLd?: unknown;
  text?: string;
}

const PRIVATE_IPV4_REGEX =
  /^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

function isPrivateOrLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower) return true;
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.arpa')
  ) {
    return true;
  }
  if (PRIVATE_IPV4_REGEX.test(lower)) return true;
  if (/^\d+$/.test(lower) || /^0x[0-9a-f]+$/i.test(lower)) return true;
  if (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('::ffff:')
  ) {
    return true;
  }
  if (!lower.includes('.')) return true;
  return false;
}

export function validateClientHttpUrl(
  rawUrl: string
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'Veuillez saisir une URL.' };
  }
  if (trimmed.length > 1000) {
    return { ok: false, error: 'URL trop longue (1000 caractères maximum).' };
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "L'URL saisie n'est pas valide." };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Seules les URL http:// ou https:// sont autorisées.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Les identifiants dans l'URL ne sont pas autorisés." };
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { ok: false, error: 'Les ports personnalisés ne sont pas autorisés.' };
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    return { ok: false, error: 'Les adresses locales ou privées ne sont pas autorisées.' };
  }

  return { ok: true, url: parsed.toString() };
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  const named: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&eacute;': 'é',
    '&Eacute;': 'É',
    '&egrave;': 'è',
    '&Egrave;': 'È',
    '&ecirc;': 'ê',
    '&Ecirc;': 'Ê',
    '&euml;': 'ë',
    '&agrave;': 'à',
    '&Agrave;': 'À',
    '&acirc;': 'â',
    '&ccedil;': 'ç',
    '&Ccedil;': 'Ç',
    '&icirc;': 'î',
    '&iuml;': 'ï',
    '&ocirc;': 'ô',
    '&ouml;': 'ö',
    '&ugrave;': 'ù',
    '&ucirc;': 'û',
    '&uuml;': 'ü',
    '&oelig;': 'œ',
    '&OElig;': 'Œ',
    '&deg;': '°',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
    '&ndash;': '-',
    '&mdash;': '-',
    '&hellip;': '...',
  };

  return input
    .replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      if (entity in named) return named[entity];
      if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
        const code = Number.parseInt(entity.slice(3, -1), 16);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : entity;
      }
      if (entity.startsWith('&#')) {
        const code = Number.parseInt(entity.slice(2, -1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : entity;
      }
      return entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
}

export function inferDurationBucket(minutes: number): PrepDuration {
  if (minutes < 20) return 'rapide';
  if (minutes <= 45) return 'moyen';
  return 'long';
}

export function parseIsoDurationMinutes(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(600, Math.max(1, Math.round(value)));
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  );
  if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3] || isoMatch[4])) {
    const days = Number(isoMatch[1] || 0);
    const hours = Number(isoMatch[2] || 0);
    const mins = Number(isoMatch[3] || 0);
    const secs = Number(isoMatch[4] || 0);
    const total = days * 1440 + hours * 60 + mins + Math.round(secs / 60);
    if (total > 0) return Math.min(600, Math.max(1, total));
  }

  const hmMatch = trimmed.match(/(\d+)\s*h(?:\s*(\d{1,2}))?/i);
  if (hmMatch) {
    const h = Number(hmMatch[1] || 0);
    const m = Number(hmMatch[2] || 0);
    const total = h * 60 + m;
    if (total > 0) return Math.min(600, Math.max(1, total));
  }

  const minMatch = trimmed.match(/(\d+)\s*(?:min(?:utes?)?|m\b)/i);
  if (minMatch) {
    const total = Number(minMatch[1]);
    if (total > 0) return Math.min(600, Math.max(1, total));
  }

  return undefined;
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function guessGroceryCategory(ingredientName: string): GroceryCategory {
  const norm = normalizeSearchText(ingredientName);

  if (/\b(surgele|surgelee|surgeles|glace|sorbet)[sx]?\b/.test(norm)) {
    return 'surgeles';
  }

  if (
    /\b(tomate|oignon|echalote|ail|carotte|pomme de terre|pommes de terre|patate|courgette|aubergine|poivron|salade|laitue|mache|roquette|epinard|brocoli|chou|champignon|poireau|avocat|citron|lime|orange|pomme|poire|banane|fraise|framboise|myrtille|cerise|peche|abricot|melon|raisin|mangue|ananas|persil|basilic|coriandre|ciboulette|menthe|thym|romarin|celeri|concombre|radis|navet|betterave|courge|potiron|butternut|haricot vert|haricots verts|petit pois|petits pois|artichaut|asperge|endive|fenouil)[sx]?\b/.test(
      norm
    )
  ) {
    return 'legumes';
  }

  if (
    /\b(poulet|boeuf|porc|veau|agneau|dinde|canard|lapin|lardon|jambon|bacon|pancetta|guanciale|saucisse|merguez|chipolata|steak|viande|escalope|filet mignon|roti|cuisse|magret|chorizo|salami|saumon|cabillaud|thon|crevette|gambas|moule|poisson|colin|lieu|truite|dorade|bar|maquereau|sardine|st jacques|saint jacques|calamar|poulpe)[sx]?\b/.test(
      norm
    )
  ) {
    return 'viandes';
  }

  if (
    /\b(lait|creme|beurre|fromage|parmesan|pecorino|mozzarella|gruyere|emmental|comte|chevre|feta|ricotta|mascarpone|roquefort|camembert|raclette|reblochon|yaourt|yogourt|fromage blanc|oeuf|pate brisee|pate feuilletee|pate sablee|pate a pizza|tofu|gnocchi)[sx]?\b/.test(
      norm
    )
  ) {
    return 'frais';
  }

  if (
    /\b(farine|sucre|cassonade|miel|sirop|huile|vinaigre|sel|poivre|pate|pates|spaghetti|tagliatelle|penne|fusilli|macaroni|coquillette|lasagne|riz|risotto|quinoa|semoule|boulgour|couscous|lentille|pois chiche|haricot rouge|haricots rouges|haricot blanc|haricots blancs|sauce|coulis|concentre|ketchup|mayonnaise|moutarde|soja|nuoc mam|chocolat|cacao|vanille|levure|bicarbonate|maizena|fecule|bouillon|epice|curry|curcuma|paprika|cumin|cannelle|muscade|origan|herbes de provence|chapelure|pain|baguette|biscotte|biscuit|noix|amande|noisette|pignon|pistache|cacahuete|olive|capre|cornichon|conserve|lait de coco)[sx]?\b/.test(
      norm
    )
  ) {
    return 'epicerie';
  }

  return 'autres';
}

function replaceUnicodeFractions(raw: string): string {
  return raw
    .replace(/(\d)\s*½/g, '$1.5')
    .replace(/(\d)\s*¼/g, '$1.25')
    .replace(/(\d)\s*¾/g, '$1.75')
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.33')
    .replace(/⅔/g, '0.67');
}

function parseNumericToken(token: string): number | undefined {
  const clean = token.trim().replace(',', '.');
  const mixed = clean.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    if (den > 0) return Number(mixed[1]) + Number(mixed[2]) / den;
  }
  const frac = clean.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den > 0) return Number((Number(frac[1]) / den).toFixed(2));
  }
  const num = Number(clean);
  if (Number.isFinite(num) && num > 0) {
    return Number(num.toFixed(2));
  }
  return undefined;
}

const UNIT_PATTERN =
  '^(?:(kg|g|gr|grammes?|mg|l|litres?|dl|cl|ml)|(c\\.?\\s*(?:à|a)\\s*soupe|c\\.?\\s*(?:à|a)\\s*s\\.?|cas|cuill[eè]res?\\s*(?:à|a)\\s*soupe|tbsp)|(c\\.?\\s*(?:à|a)\\s*caf[ée]|c\\.?\\s*(?:à|a)\\s*c\\.?|cac|cuill[eè]res?\\s*(?:à|a)\\s*caf[ée]|tsp)|(pinc[ée]es?|gousses?|tranches?|bo[îi]tes?|sachets?|verres?|tasses?|brins?|feuilles?|bottes?|filets?|pav[ée]s?|pots?|morceaux?|poign[ée]es?|briques?|paquets?|rouleaux?|branches?))(?=[\\s’\']|$)';

function normalizeUnitLabel(rawUnit: string): string {
  const low = rawUnit.toLowerCase().replace(/\s+/g, ' ').trim();
  if (low === 'gr' || /^grammes?$/.test(low)) return 'g';
  if (/^litres?$/.test(low)) return 'L';
  if (low === 'l') return 'L';
  if (/^(?:c\.?\s*(?:à|a)\s*soupe|c\.?\s*(?:à|a)\s*s\.?|cas|cuill[eè]res?\s*(?:à|a)\s*soupe|tbsp)$/.test(low)) {
    return 'c. à soupe';
  }
  if (/^(?:c\.?\s*(?:à|a)\s*caf[ée]|c\.?\s*(?:à|a)\s*c\.?|cac|cuill[eè]res?\s*(?:à|a)\s*caf[ée]|tsp)$/.test(low)) {
    return 'c. à café';
  }
  return low;
}

function stripFrenchPreposition(name: string): string {
  return name
    .replace(/^(?:de\s+l['’]|de\s+la\s+|du\s+|des\s+|de\s+|d['’]\s*)/i, '')
    .trim();
}

export function parseIngredientLine(rawLine: string, idx = 0): Ingredient | null {
  let line = decodeHtmlEntities(rawLine)
    .replace(/^[\s\-•*·☐☑✔✓◦▪▸►]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!line || line.length < 2) return null;
  // Ignore section headers accidentally placed in ingredient lists
  if (/^(?:ingr[ée]dients?|pour\s+\d+\s+pers)/i.test(line) && line.endsWith(':')) {
    return null;
  }

  line = replaceUnicodeFractions(line);

  let amount: number | undefined;
  let unit = '';
  let name = line;

  // Pattern 1: leading amount (+ optional range like 200-250 or 2 à 3)
  const leadingQtyMatch = line.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*(?:-|à|ou)\s*\d+(?:[.,]\d+)?)?\s+(.*)$/i
  );

  // Also handle attached metric like "250g farine" or "20cl crème"
  const attachedQtyMatch =
    !leadingQtyMatch &&
    line.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|mg|ml|cl|dl|l)\b\s*(.*)$/i);

  if (attachedQtyMatch) {
    amount = parseNumericToken(attachedQtyMatch[1]);
    unit = normalizeUnitLabel(attachedQtyMatch[2]);
    name = stripFrenchPreposition(attachedQtyMatch[3] || '');
  } else if (leadingQtyMatch) {
    amount = parseNumericToken(leadingQtyMatch[1]);
    let rest = leadingQtyMatch[2].trim();
    const unitRe = new RegExp(UNIT_PATTERN, 'i');
    const unitMatch = rest.match(unitRe);
    if (unitMatch) {
      unit = normalizeUnitLabel(unitMatch[0]);
      rest = rest.slice(unitMatch[0].length).trim();
    }
    name = stripFrenchPreposition(rest);
  } else {
    // Pattern 2: trailing amount like "Lardons : 200 g" or "Farine (250 g)"
    const trailingMatch = line.match(
      /^(.+?)\s*(?::|\()\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|mg|ml|cl|dl|l|c\.?\s*(?:à|a)\s*soupe|c\.?\s*(?:à|a)\s*café|gousses?|tranches?|boîtes?|sachets?)?\s*\)?$/i
    );
    if (trailingMatch) {
      name = trailingMatch[1].trim();
      amount = parseNumericToken(trailingMatch[2]);
      unit = trailingMatch[3] ? normalizeUnitLabel(trailingMatch[3]) : '';
    }
  }

  name = name.replace(/^[,;:\-–]+\s*/, '').trim();
  if (!name) name = line;
  name = name.slice(0, 150);

  return {
    id: toSafeId(`${name}-${idx}`, 'ing'),
    name,
    ...(amount !== undefined ? { amount } : {}),
    ...(unit ? { unit: unit.slice(0, 40) } : {}),
    category: guessGroceryCategory(name),
  };
}

export function inferRecipeCategory(rawCategory?: string, title = ''): RecipeCategory {
  const combined = normalizeSearchText(`${rawCategory || ''} ${title}`);
  if (/\b(entree|starter|appetizer|aperitif|veloute|soupe|salade d'entree|terrine)\b/.test(combined)) {
    return 'entree';
  }
  if (/\b(accompagnement|side|garniture|puree|gratin de legumes|riz pilaf)\b/.test(combined)) {
    return 'accompagnement';
  }
  return 'plat';
}

export function inferCuisineType(
  title: string,
  ingredients: Ingredient[],
  tags: string[],
  prepMinutes: number,
  dietText = ''
): RecipeCuisine {
  const joined = normalizeSearchText(
    `${title} ${tags.join(' ')} ${dietText} ${ingredients.map((i) => i.name).join(' ')}`
  );

  const hasFish = /\b(saumon|cabillaud|thon|crevette|poisson|moule|truite|colin|dorade|bar|maquereau|sardine|saint jacques|st jacques)\b/.test(
    joined
  );
  if (hasFish) return 'poisson';

  const hasMeat = /\b(poulet|boeuf|porc|veau|agneau|dinde|canard|lardon|jambon|bacon|pancetta|guanciale|saucisse|merguez|steak|viande|chorizo|salami)\b/.test(
    joined
  );
  if (
    !hasMeat &&
    /\b(vegetarien|vegetarian|vegan|vegetalien|legumes|lentille|pois chiche|tofu|quinoa)\b/.test(
      joined
    )
  ) {
    return 'végétarien';
  }
  if (/\b(raclette|fondue|tartiflette|lasagne|pizza|burger|tacos|apero|convivial|barbecue)\b/.test(joined)) {
    return 'convivial';
  }
  if (/\b(healthy|sain|equilibre|bowl|buddha|vapeur|quinoa|avocat)\b/.test(joined)) {
    return 'healthy';
  }
  if (prepMinutes < 20) return 'rapide';
  return 'classique';
}

function flattenJsonLdInstructions(instructions: unknown): string[] {
  const steps: string[] = [];
  if (!instructions) return steps;

  if (typeof instructions === 'string') {
    const lines = instructions
      .split(/\r?\n+/)
      .map((l) => stripHtmlTags(l).replace(/^\d+[.)]\s*/, '').trim())
      .filter((l) => l.length > 2);
    return lines;
  }

  if (Array.isArray(instructions)) {
    for (const item of instructions) {
      steps.push(...flattenJsonLdInstructions(item));
    }
    return steps;
  }

  if (typeof instructions === 'object') {
    const obj = instructions as Record<string, unknown>;
    if (Array.isArray(obj.itemListElement)) {
      steps.push(...flattenJsonLdInstructions(obj.itemListElement));
    } else if (typeof obj.text === 'string') {
      const cleaned = stripHtmlTags(obj.text).replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 2) steps.push(cleaned);
    } else if (typeof obj.name === 'string' && !obj.itemListElement) {
      const cleaned = stripHtmlTags(obj.name).trim();
      if (cleaned.length > 2) steps.push(cleaned);
    }
  }

  return steps;
}

function extractImageUrl(imageField: unknown): string | undefined {
  if (!imageField) return undefined;
  if (typeof imageField === 'string') return sanitizeHttpUrl(imageField);
  if (Array.isArray(imageField)) {
    for (const entry of imageField) {
      const candidate = extractImageUrl(entry);
      if (candidate) return candidate;
    }
  }
  if (typeof imageField === 'object') {
    const obj = imageField as Record<string, unknown>;
    return sanitizeHttpUrl(obj.url || obj.contentUrl);
  }
  return undefined;
}

function parseYieldServings(yieldVal: unknown): number {
  const candidates = Array.isArray(yieldVal) ? yieldVal : [yieldVal];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c >= 1 && c <= 50) {
      return Math.round(c);
    }
    if (typeof c === 'string') {
      const m = c.match(/(\d+)/);
      if (m) {
        const n = Number(m[1]);
        if (n >= 1 && n <= 50) return n;
      }
    }
  }
  return 4;
}

function isRecipeNode(node: Record<string, unknown>): boolean {
  const rawType = node['@type'];
  const types = Array.isArray(rawType) ? rawType : [rawType];
  return types.some(
    (t) =>
      typeof t === 'string' &&
      (t === 'Recipe' || t.endsWith('/Recipe') || t.toLowerCase() === 'recipe')
  );
}

function findRecipeNode(data: unknown, depth = 0): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || depth > 8) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (isRecipeNode(obj)) return obj;

  if (Array.isArray(obj['@graph'])) {
    const found = findRecipeNode(obj['@graph'], depth + 1);
    if (found) return found;
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const found = findRecipeNode(val, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function stringListFromField(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') {
    return val
      .split(/[,;]/)
      .map((s) => decodeHtmlEntities(s))
      .filter(Boolean);
  }
  if (Array.isArray(val)) {
    return val.flatMap((v) => stringListFromField(v));
  }
  return [];
}

export function extractRecipeFromJsonLdObject(
  data: unknown,
  sourceUrl?: string
): ExtractedRecipeDraft | null {
  const node = findRecipeNode(data);
  if (!node) return null;

  const rawTitle = typeof node.name === 'string' ? decodeHtmlEntities(node.name) : '';
  if (!rawTitle) return null;

  const totalMin = parseIsoDurationMinutes(node.totalTime);
  const prepMin = parseIsoDurationMinutes(node.prepTime);
  const cookMin = parseIsoDurationMinutes(node.cookTime);
  const prepMinutes = Math.min(
    600,
    Math.max(1, totalMin ?? ((prepMin || 0) + (cookMin || 0) || 25))
  );

  const rawIngs = Array.isArray(node.recipeIngredient)
    ? node.recipeIngredient
    : Array.isArray(node.ingredients)
    ? node.ingredients
    : [];

  const ingredients = rawIngs
    .filter((item): item is string => typeof item === 'string')
    .slice(0, 50)
    .map((line, idx) => parseIngredientLine(line, idx))
    .filter((ing): ing is Ingredient => ing !== null);

  const steps = flattenJsonLdInstructions(node.recipeInstructions).slice(0, 40);

  if (ingredients.length === 0 && steps.length === 0) {
    return null;
  }

  const rawTags = [
    ...stringListFromField(node.recipeCuisine),
    ...stringListFromField(node.recipeCategory),
    ...stringListFromField(node.keywords),
  ]
    .map((t) => t.slice(0, 40))
    .filter((t, idx, arr) => t.length > 1 && arr.indexOf(t) === idx)
    .slice(0, 10);

  const category = inferRecipeCategory(
    stringListFromField(node.recipeCategory).join(' '),
    rawTitle
  );
  const dietText = stringListFromField(node.suitableForDiet).join(' ');
  const cuisineType = inferCuisineType(rawTitle, ingredients, rawTags, prepMinutes, dietText);
  const servings = parseYieldServings(node.recipeYield);

  return {
    title: rawTitle.slice(0, 200),
    category,
    cuisineType,
    prepDuration: inferDurationBucket(prepMinutes),
    prepMinutes,
    servings,
    ingredients,
    steps,
    tags: rawTags.length > 0 ? rawTags : ['importé'],
    sourceUrl: sanitizeHttpUrl(sourceUrl),
    imageUrl: extractImageUrl(node.image),
    extractionMethod: 'json-ld',
  };
}

function extractMetaTitleFromHtml(html: string): string | undefined {
  const ogMatch = html.match(
    /<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']+)["']/i
  );
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]);

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) return stripHtmlTags(h1Match[1]);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) return decodeHtmlEntities(titleMatch[1]);

  return undefined;
}

export function parseRecipeFromHtml(
  html: string,
  sourceUrl?: string
): ExtractedRecipeDraft | null {
  if (!html || typeof html !== 'string') return null;

  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    const rawJson = match[1]
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      const recipe = extractRecipeFromJsonLdObject(parsed, sourceUrl);
      if (recipe) return recipe;
    } catch {
      // Some sites contain trailing commas or multiple scripts; skip invalid block
    }
  }

  const fallbackTitle = extractMetaTitleFromHtml(html);
  const readableText = html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return parseRecipeFromText(decodeHtmlEntities(readableText), sourceUrl, fallbackTitle);
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*]\s*)?\[[ xX]?\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitleNoise(title: string): string {
  return stripMarkdownInline(title)
    .replace(/^Title:\s*/i, '')
    .replace(/^#+\s*/, '')
    .replace(/\s*[|\-–—]\s*(?:Marmiton|750g|CuisineAZ|Cuisine\s*AZ|Jow|Elle\s*à\s*Table|Ricardo).*$/i, '')
    .trim();
}

export function parseRecipeFromText(
  rawText: string,
  sourceUrl?: string,
  fallbackTitle?: string
): ExtractedRecipeDraft | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();
  if (trimmed.length < 15) return null;

  // Check if user pasted raw JSON-LD
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const fromJson = extractRecipeFromJsonLdObject(parsed, sourceUrl);
      if (fromJson) return fromJson;
    } catch {
      // Continue with plain text parsing
    }
  }

  // Normalize inline Markdown headings / bullets / step markers onto clean lines
  const normalizedBlock = trimmed
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(#{1,4}\s*(?:Ingr[ée]dients?|Pr[ée]paration|Ustensiles|Note de l'auteur|[ÉE]tapes?|Instructions?))/gi, '\n$1\n')
    .replace(/(\[[xX ]\])/g, '\n$1')
    .replace(/\b([ÉEée]tape\s*\d+)\b/g, '\n$1: ');

  const lines = normalizedBlock
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // Extract title
  let title = '';
  for (const line of lines.slice(0, 12)) {
    if (/^Title:\s+/i.test(line)) {
      title = cleanTitleNoise(line);
      break;
    }
    if (/^#\s+/.test(line)) {
      title = cleanTitleNoise(line);
      break;
    }
  }
  if (!title && fallbackTitle) {
    title = cleanTitleNoise(fallbackTitle);
  }
  if (!title) {
    const firstUseful = lines.find(
      (l) =>
        !/^(?:URL Source:|Markdown Content:|Published Time:|Warning:|Ingr[ée]dients?\s*:?$)/i.test(
          l
        ) && l.length >= 3
    );
    if (firstUseful) {
      // Handle single-line format: "Tarte aux pommes : 3 pommes, ..."
      const colonIdx = firstUseful.indexOf(':');
      if (colonIdx > 3 && colonIdx < 80) {
        title = cleanTitleNoise(firstUseful.slice(0, colonIdx));
      } else {
        title = cleanTitleNoise(firstUseful);
      }
    }
  }
  if (!title && sourceUrl) {
    title = titleFromUrlSlug(sourceUrl);
  }
  if (!title) return null;

  // Detect servings and prep minutes anywhere in header/text
  let servings = 4;
  const servingsMatch = trimmed.match(
    /(?:pour|servings?|portions?|personnes?|pers\.?)\s*:?\s*(\d{1,2})|(\d{1,2})\s*(?:personnes?|pers\.?|portions?|parts)/i
  );
  if (servingsMatch) {
    const n = Number(servingsMatch[1] || servingsMatch[2]);
    if (n >= 1 && n <= 50) servings = n;
  }

  let prepMinutes = 25;
  const timeMatch = trimmed.match(
    /(?:temps\s*(?:total|de\s*pr[ée]paration)|pr[ée]paration)\s*:?\s*(\d+\s*h(?:\s*\d{1,2})?|\d+\s*min(?:utes?)?)/i
  );
  if (timeMatch) {
    prepMinutes = parseIsoDurationMinutes(timeMatch[1]) ?? 25;
  }

  // Split into sections
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];
  let section: 'none' | 'ingredients' | 'steps' = 'none';

  for (const rawLine of lines) {
    const line = stripMarkdownInline(rawLine);
    if (!line) continue;

    const normalized = normalizeSearchText(rawLine.replace(/^#+\s*/, '').replace(/[:*]/g, '').trim());

    if (/^(?:ingredients?|ce qu'il vous faut|pour la recette|liste des ingredients)$/.test(normalized)) {
      section = 'ingredients';
      continue;
    }
    if (
      /^(?:preparation|etapes?|instructions?|deroule|realisation|recette|method|directions?)$/.test(
        normalized
      )
    ) {
      section = 'steps';
      continue;
    }
    if (
      /^(?:ustensiles?|commentaires|avis|notes?|note de l'auteur|astuces|conseils|recettes similaires|vous aimerez)/.test(
        normalized
      ) ||
      /^En cliquant sur les liens|^La suite après cette publicité|^Qu'est-ce qu'on mange/i.test(line)
    ) {
      if (section !== 'none') section = 'none';
      continue;
    }
    if (/^(?:URL Source:|Markdown Content:|Title:|Warning:|Version veggie|personnes \+)/i.test(line)) {
      continue;
    }

    if (section === 'ingredients') {
      // Truncate inline ad notices attached at end of last ingredient
      const cleanedIng = line
        .replace(/En cliquant sur les liens[\s\S]*$/i, '')
        .replace(/^personnes\s*\+\s*/i, '')
        .trim();
      if (
        cleanedIng.length >= 2 &&
        !/^[-+]+$/.test(cleanedIng) &&
        !/^(?:personnes?|portions?|parts?)\s*[+\-]?$/i.test(cleanedIng) &&
        !/^Version\s+veggie\b/i.test(cleanedIng)
      ) {
        ingredientLines.push(cleanedIng);
      }
    } else if (section === 'steps') {
      // Skip pure timing summary lines right below "## Préparation"
      if (
        /^(?:\*\s*)?(?:Temps\s*total|Pr[ée]paration|Repos|Cuisson)\s*:/i.test(line) &&
        !/[ÉEée]tape/i.test(line)
      ) {
        continue;
      }
      const withoutStepPrefix = line
        .replace(/^(?:[ÉEée]tape\s*\d+\s*[:.\-]?|\d+\s*[.)\-:])\s*/i, '')
        .replace(/Anonyme\s*Note de l'auteur[\s\S]*$/i, '')
        .replace(/Note de l'auteur[\s\S]*$/i, '')
        .trim();
      if (withoutStepPrefix.length > 6) {
        stepLines.push(withoutStepPrefix);
      }
    }
  }

  // Compact single-paragraph fallback: "Titre : ing1, ing2, ing3. Étapes : 1. ..."
  if (ingredientLines.length === 0 && stepLines.length === 0) {
    const stepSplit = trimmed.split(/(?:[ÉE]tapes?|Pr[ée]paration)\s*:/i);
    const ingPart = stepSplit[0] || '';
    const colonPos = ingPart.indexOf(':');
    const ingSegment = colonPos !== -1 ? ingPart.slice(colonPos + 1) : ingPart;

    for (const part of ingSegment.split(/[,;\n]/)) {
      const cleaned = stripMarkdownInline(part);
      if (cleaned.length >= 2 && cleaned !== title) {
        ingredientLines.push(cleaned);
      }
    }

    if (stepSplit[1]) {
      const rawSteps = stepSplit[1]
        .split(/(?:\s*\d+\.\s+|\n+)/)
        .map((s) => stripMarkdownInline(s))
        .filter((s) => s.length > 3);
      stepLines.push(...rawSteps);
    }
  }

  const ingredients = ingredientLines
    .slice(0, 50)
    .map((line, idx) => parseIngredientLine(line, idx))
    .filter((ing): ing is Ingredient => ing !== null);

  const steps = stepLines.slice(0, 40);

  if (ingredients.length === 0 && steps.length === 0) {
    return null;
  }

  const tags = ['importé'];
  const cuisineType = inferCuisineType(title, ingredients, tags, prepMinutes);

  return {
    title: title.slice(0, 200),
    category: inferRecipeCategory(undefined, title),
    cuisineType,
    prepDuration: inferDurationBucket(prepMinutes),
    prepMinutes,
    servings,
    ingredients,
    steps,
    tags,
    sourceUrl: sanitizeHttpUrl(sourceUrl),
    extractionMethod: 'text',
  };
}

export function titleFromUrlSlug(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || parsed.hostname;
    const cleaned = last
      .replace(/\.(?:html?|aspx?|php)$/i, '')
      .replace(/^recette[_-]/i, '')
      .replace(/[_-]r?\d+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (!cleaned) return 'Nouvelle recette importée';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return 'Nouvelle recette importée';
  }
}

export function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(b64url: string): string | null {
  try {
    const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + '='.repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function decodeBookmarkletImportHash(hash: string): ExtractedRecipeDraft | null {
  const prefix = '#import-recipe=';
  if (!hash || !hash.startsWith(prefix)) return null;
  const encoded = hash.slice(prefix.length).trim();
  if (!encoded || encoded.length > 32_000) return null;

  const jsonStr = fromBase64Url(encoded);
  if (!jsonStr || jsonStr.length > 40_000) return null;

  let payload: BookmarkletTransferPayload;
  try {
    payload = JSON.parse(jsonStr) as BookmarkletTransferPayload;
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object' || payload.v !== 1) {
    return null;
  }

  const safeUrl = sanitizeHttpUrl(payload.url);

  if (payload.jsonLd) {
    const fromJsonLd = extractRecipeFromJsonLdObject(payload.jsonLd, safeUrl);
    if (fromJsonLd) {
      return { ...fromJsonLd, extractionMethod: 'bookmarklet' };
    }
  }

  if (typeof payload.text === 'string' && payload.text.trim()) {
    const fromText = parseRecipeFromText(payload.text, safeUrl, payload.title);
    if (fromText) {
      return { ...fromText, extractionMethod: 'bookmarklet' };
    }
  }

  const fallbackTitle =
    (typeof payload.title === 'string' && cleanTitleNoise(payload.title)) ||
    (safeUrl ? titleFromUrlSlug(safeUrl) : '');

  if (!fallbackTitle) return null;

  return {
    title: fallbackTitle.slice(0, 200),
    category: 'plat',
    cuisineType: 'classique',
    prepDuration: 'moyen',
    prepMinutes: 25,
    servings: 4,
    ingredients: [],
    steps: [],
    tags: ['importé'],
    sourceUrl: safeUrl,
    extractionMethod: 'bookmarklet',
  };
}

export function buildBookmarkletHref(appUrl: string): string {
  const cleanAppUrl = appUrl.split('#')[0].split('?')[0];
  const script = `(function(){try{var d=document,s=d.querySelectorAll('script[type="application/ld+json"]'),j=null;function f(x,n){if(!x||typeof x!=='object'||n>7)return null;if(Array.isArray(x)){for(var i=0;i<x.length;i++){var r=f(x[i],n+1);if(r)return r;}return null;}var t=x['@type'],a=Array.isArray(t)?t:[t];if(a.some(function(k){return typeof k==='string'&&/recipe$/i.test(k);}))return x;if(x['@graph']){var g=f(x['@graph'],n+1);if(g)return g;}for(var p in x){if(typeof x[p]==='object'){var c=f(x[p],n+1);if(c)return c;}}return null;}for(var i=0;i<s.length;i++){try{var o=JSON.parse(s[i].textContent);var r=f(o,0);if(r){j=r;break;}}catch(e){}}var h=d.querySelector('h1');var payload={v:1,url:location.href,title:(h?h.innerText:d.title)||d.title,jsonLd:j||undefined,text:j?undefined:(d.body?d.body.innerText.slice(0,7000):'')};var b=new TextEncoder().encode(JSON.stringify(payload)),bin='';for(var k=0;k<b.length;k++)bin+=String.fromCharCode(b[k]);var enc=btoa(bin).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');window.open(${JSON.stringify(
    cleanAppUrl
  )}+'#import-recipe='+enc,'_blank');}catch(e){alert('Impossible de lire la recette sur cette page.');}})();`;
  return `javascript:${script}`;
}

export function draftToRecipeInput(
  draft: Partial<ExtractedRecipeDraft> & { title: string }
): Omit<Recipe, 'id' | 'createdAt'> {
  return {
    title: draft.title.trim(),
    category: draft.category || 'plat',
    cuisineType: draft.cuisineType || 'classique',
    prepDuration: draft.prepDuration || 'moyen',
    prepMinutes: draft.prepMinutes || 25,
    servings: draft.servings || 4,
    ingredients: draft.ingredients || [],
    steps: draft.steps || [],
    tags: draft.tags && draft.tags.length > 0 ? draft.tags : ['importé'],
    sourceUrl: sanitizeHttpUrl(draft.sourceUrl),
    imageUrl: sanitizeHttpUrl(draft.imageUrl),
  };
}
