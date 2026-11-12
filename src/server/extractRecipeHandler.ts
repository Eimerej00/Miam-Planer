import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI } from '@google/genai';
import { assertPublicHostname, validateExternalRecipeUrl } from '../utils/urlSecurity.ts';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const requestLogByIp = new Map<string, number[]>();

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const prev = requestLogByIp.get(clientIp) || [];
  const recent = prev.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLogByIp.set(clientIp, recent);
    return true;
  }
  recent.push(now);
  requestLogByIp.set(clientIp, recent);
  return false;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

async function fetchPublicRecipeHtml(initialUrl: string): Promise<string> {
  let currentUrl = initialUrl;

  for (let hops = 0; hops <= 3; hops++) {
    const check = validateExternalRecipeUrl(currentUrl);
    if (!check.ok) {
      throw new Error(check.reason);
    }

    await assertPublicHostname(check.url.hostname);

    const fetchRes = await fetch(check.url.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MiamPlannerBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/json',
      },
    });

    if (fetchRes.status >= 300 && fetchRes.status < 400) {
      const location = fetchRes.headers.get('location');
      if (!location) {
        throw new Error('Redirection invalide.');
      }
      currentUrl = new URL(location, check.url).toString();
      continue;
    }

    if (!fetchRes.ok) {
      throw new Error(`HTTP ${fetchRes.status}`);
    }

    const contentLength = Number(fetchRes.headers.get('content-length') || '0');
    if (contentLength > MAX_FETCH_BYTES) {
      throw new Error('La page distante est trop volumineuse.');
    }

    const reader = fetchRes.body?.getReader();
    if (!reader) {
      return await fetchRes.text();
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_FETCH_BYTES) {
          await reader.cancel();
          throw new Error('La page distante dépasse la taille maximale autorisée.');
        }
        chunks.push(value);
      }
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(merged);
  }

  throw new Error('Trop de redirections.');
}

export async function handleExtractRecipeRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  const clientIp =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.socket?.remoteAddress) || 'unknown';

  if (isRateLimited(clientIp)) {
    sendJson(res, 429, { error: 'Trop de requêtes. Réessayez dans une minute.' });
    return;
  }

  let bodyBytes = 0;
  const bodyChunks: Buffer[] = [];
  let abortedForSize = false;

  req.on('data', (chunk: Buffer) => {
    bodyBytes += chunk.byteLength;
    if (bodyBytes > MAX_BODY_BYTES) {
      abortedForSize = true;
      req.destroy();
      return;
    }
    bodyChunks.push(chunk);
  });

  req.on('end', async () => {
    if (abortedForSize) {
      sendJson(res, 413, { error: 'Requête trop volumineuse.' });
      return;
    }

    try {
      const rawBody = Buffer.concat(bodyChunks).toString('utf8');
      const parsedBody = JSON.parse(rawBody || '{}') as {
        url?: unknown;
        rawContent?: unknown;
      };

      const url = typeof parsedBody.url === 'string' ? parsedBody.url.trim() : '';
      const rawContent =
        typeof parsedBody.rawContent === 'string'
          ? parsedBody.rawContent.slice(0, 20_000).trim()
          : '';

      if (!url && !rawContent) {
        sendJson(res, 400, { error: 'Veuillez fournir une URL ou un texte de recette.' });
        return;
      }

      if (url) {
        const validation = validateExternalRecipeUrl(url);
        if (!validation.ok) {
          sendJson(res, 400, { error: validation.reason });
          return;
        }
      }

      let recipeContext = rawContent;

      if (url && !recipeContext) {
        try {
          const text = await fetchPublicRecipeHtml(url);
          const jsonLdMatches = text.match(
            /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi
          );
          if (jsonLdMatches && jsonLdMatches.length > 0) {
            recipeContext = jsonLdMatches.join('\n').slice(0, 15_000);
          } else {
            const stripped = text
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            recipeContext = stripped.slice(0, 10_000);
          }
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : '';
          if (
            msg.includes('interdit') ||
            msg.includes('privée') ||
            msg.includes('réservée') ||
            msg.includes('Protocole')
          ) {
            sendJson(res, 400, { error: msg });
            return;
          }
          recipeContext = `URL fournie : ${url}`;
        }
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        sendJson(res, 503, {
          error: 'Service d’extraction IA indisponible sur ce serveur.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `Tu es un chef cuisinier expert en organisation familiale pour l'application Miam Planner.
Ta mission est d'extraire ou de reconstituer une recette complète et équilibrée à partir d'une URL de cuisine ou d'un texte fourni.
Tu dois répondre STRICTEMENT au format JSON avec la structure suivante :
{
  "title": "Nom appétissant de la recette",
  "category": "plat" | "entree" | "accompagnement",
  "prepDuration": "rapide" | "moyen" | "long",
  "prepMinutes": 25,
  "servings": 4,
  "ingredients": [
    { "name": "Nom de l'ingrédient", "amount": 200, "unit": "g", "category": "legumes" | "viandes" | "frais" | "epicerie" | "surgeles" | "autres" }
  ],
  "steps": ["Étape 1...", "Étape 2..."],
  "tags": ["familial", "saison", "etc."],
  "imageHint": "mots clés décrivant le plat pour l'illustration"
}`;

      const prompt = `Voici la source de la recette :\nURL: ${url || 'Non précisée'}\nContenu ou extrait textuel:\n${recipeContext || 'Recette familiale'}\n\nExtrais et structure la recette en français conformément au format demandé.`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const jsonOutput = aiRes.text || '{}';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(jsonOutput);
    } catch (err) {
      console.error('Error in /api/extract-recipe:', err instanceof Error ? err.message : 'Unknown error');
      sendJson(res, 500, { error: 'Impossible d’extraire cette recette pour le moment.' });
    }
  });
}
