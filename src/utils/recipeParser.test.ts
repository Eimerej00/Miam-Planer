import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookmarkletHref,
  decodeBookmarkletImportHash,
  extractRecipeFromJsonLdObject,
  guessGroceryCategory,
  inferDurationBucket,
  parseIngredientLine,
  parseIsoDurationMinutes,
  parseRecipeFromHtml,
  parseRecipeFromText,
  titleFromUrlSlug,
  toBase64Url,
  validateClientHttpUrl,
} from './recipeParser.ts';

test('validateClientHttpUrl accepts valid public URLs and blocks private/local targets', () => {
  const valid = validateClientHttpUrl('https://www.marmiton.org/recettes/recette_test_1.aspx');
  assert.equal(valid.ok, true);

  const withoutScheme = validateClientHttpUrl('www.750g.com/carbonara-r123.htm');
  assert.equal(withoutScheme.ok, true);
  if (withoutScheme.ok) {
    assert.equal(withoutScheme.url.startsWith('https://'), true);
  }

  for (const blocked of [
    'http://localhost:3000/test',
    'http://127.0.0.1/admin',
    'http://192.168.1.10/recipe',
    'http://10.0.0.1/internal',
    'http://169.254.169.254/latest/meta-data',
    'https://user:pass@example.com/recipe',
    'https://example.com:8443/recipe',
    'javascript:alert(1)',
    'file:///etc/passwd',
  ]) {
    const res = validateClientHttpUrl(blocked);
    assert.equal(res.ok, false, `Expected ${blocked} to be rejected`);
  }
});

test('parseIsoDurationMinutes and inferDurationBucket handle ISO and French durations', () => {
  assert.equal(parseIsoDurationMinutes('PT15M'), 15);
  assert.equal(parseIsoDurationMinutes('PT1H20M'), 80);
  assert.equal(parseIsoDurationMinutes('P0DT2H'), 120);
  assert.equal(parseIsoDurationMinutes('35 min'), 35);
  assert.equal(parseIsoDurationMinutes('1h15'), 75);

  assert.equal(inferDurationBucket(15), 'rapide');
  assert.equal(inferDurationBucket(30), 'moyen');
  assert.equal(inferDurationBucket(60), 'long');
});

test('parseIngredientLine parses French quantities, units, fractions, and grocery categories', () => {
  const lardons = parseIngredientLine('200 g de lardons fumés', 0);
  assert.ok(lardons);
  assert.equal(lardons.amount, 200);
  assert.equal(lardons.unit, 'g');
  assert.equal(lardons.name, 'lardons fumés');
  assert.equal(lardons.category, 'viandes');

  const oil = parseIngredientLine("2 c. à soupe d'huile d'olive", 1);
  assert.ok(oil);
  assert.equal(oil.amount, 2);
  assert.equal(oil.unit, 'c. à soupe');
  assert.equal(oil.name, "huile d'olive");
  assert.equal(oil.category, 'epicerie');

  const lemon = parseIngredientLine('½ citron jaune', 2);
  assert.ok(lemon);
  assert.equal(lemon.amount, 0.5);
  assert.equal(lemon.name, 'citron jaune');
  assert.equal(lemon.category, 'legumes');

  const attached = parseIngredientLine('250g farine de blé', 3);
  assert.ok(attached);
  assert.equal(attached.amount, 250);
  assert.equal(attached.unit, 'g');
  assert.equal(attached.name, 'farine de blé');

  assert.equal(guessGroceryCategory('crème fraîche épaisse'), 'frais');
});

test('extractRecipeFromJsonLdObject extracts Schema.org Recipe inside @graph with HowToSection', () => {
  const doc = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'Page' },
      {
        '@type': ['Recipe'],
        name: 'Quiche Lorraine maison',
        prepTime: 'PT15M',
        cookTime: 'PT35M',
        recipeYield: '6 personnes',
        recipeCategory: 'Plat principal',
        recipeIngredient: [
          '1 pâte brisée',
          '200 g de lardons',
          '3 oeufs',
          '20 cl de crème fraîche',
        ],
        recipeInstructions: [
          {
            '@type': 'HowToSection',
            name: 'Préparation',
            itemListElement: [
              { '@type': 'HowToStep', text: 'Préchauffer le four à 180°C.' },
              { '@type': 'HowToStep', text: 'Faire revenir les lardons à la poêle.' },
            ],
          },
        ],
      },
    ],
  };

  const draft = extractRecipeFromJsonLdObject(doc, 'https://example.com/quiche');
  assert.ok(draft);
  assert.equal(draft.title, 'Quiche Lorraine maison');
  assert.equal(draft.prepMinutes, 50);
  assert.equal(draft.prepDuration, 'long');
  assert.equal(draft.servings, 6);
  assert.equal(draft.ingredients.length, 4);
  assert.equal(draft.steps.length, 2);
  assert.equal(draft.extractionMethod, 'json-ld');
});

test('parseRecipeFromHtml parses embedded ld+json script tag', () => {
  const html = `
    <html>
      <head>
        <title>Gratin dauphinois</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Recipe",
            "name": "Gratin dauphinois facile",
            "totalTime": "PT40M",
            "recipeYield": "4 portions",
            "recipeIngredient": ["1 kg de pommes de terre", "40 cl de crème liquide", "1 gousse d'ail"],
            "recipeInstructions": ["Éplucher et couper les pommes de terre.", "Cuire au four 35 min."]
          }
        </script>
      </head>
      <body><h1>Gratin</h1></body>
    </html>
  `;

  const draft = parseRecipeFromHtml(html, 'https://example.com/gratin');
  assert.ok(draft);
  assert.equal(draft.title, 'Gratin dauphinois facile');
  assert.equal(draft.prepMinutes, 40);
  assert.equal(draft.ingredients.length, 3);
  assert.equal(draft.steps.length, 2);
});

test('parseRecipeFromText parses Marmiton-style Jina Markdown output cleanly', () => {
  const jinaSample = `
Title: Pâtes à la "carbonara" à la française | Marmiton

URL Source: https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_80453.aspx

Markdown Content:
## Ingrédients
- [x] [![Image 23: lardons](https://assets.afcdn.com/img.png) 250 g de lardons](https://example.com/lardons)
- [x] [![Image 24: crème](https://assets.afcdn.com/img2.png) 50 cl de crème fraîche](https://example.com/creme)
- [x] ![Image 25: pâtes](https://assets.afcdn.com/img3.png) 500 g de pâtes
En cliquant sur les liens, vous pouvez être redirigé vers Amazon.fr.
## Ustensiles
1 Plat à four
## Préparation
Temps total : 20 min * Préparation: 10 min * Cuisson: 10 min
étape 1 ![Image 37: pâtes](https://assets.afcdn.com/pates.png) Cuire les pâtes dans l'eau bouillante salée.
étape 2 Faire revenir les lardons à la poêle.
étape 3 Incorporer la crème fraîche et servir chaud.
Note de l'auteur : Bon appétit !
  `;

  const draft = parseRecipeFromText(
    jinaSample,
    'https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_80453.aspx'
  );
  assert.ok(draft);
  assert.equal(draft.title, 'Pâtes à la "carbonara" à la française');
  assert.equal(draft.prepMinutes, 20);
  assert.equal(draft.ingredients.length, 3);
  assert.equal(draft.ingredients[0].amount, 250);
  assert.equal(draft.ingredients[0].unit, 'g');
  assert.equal(draft.ingredients[0].name, 'lardons');
  assert.equal(draft.steps.length, 3);
  assert.equal(draft.steps[0], "Cuire les pâtes dans l'eau bouillante salée.");
});

test('parseRecipeFromText handles compact copied text format', () => {
  const compact =
    'Tarte aux pommes : 3 pommes, 1 pâte brisée, 50 g de sucre. Étapes : 1. Préchauffer le four à 180°C. 2. Disposer les pommes et enfourner 30 min.';
  const draft = parseRecipeFromText(compact);
  assert.ok(draft);
  assert.equal(draft.title, 'Tarte aux pommes');
  assert.equal(draft.ingredients.length, 3);
  assert.equal(draft.steps.length, 2);
});

test('titleFromUrlSlug produces readable fallback titles', () => {
  assert.equal(
    titleFromUrlSlug('https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_80453.aspx'),
    'Pates a la carbonara'
  );
  assert.equal(
    titleFromUrlSlug('https://www.750g.com/gratin-dauphinois-r200694.htm'),
    'Gratin dauphinois'
  );
});

test('decodeBookmarkletImportHash decodes valid JSON-LD payload and rejects malformed input', () => {
  const payload = {
    v: 1,
    url: 'https://www.example.com/recette-veloute',
    title: 'Velouté de potiron',
    jsonLd: {
      '@type': 'Recipe',
      name: 'Velouté de potiron',
      prepTime: 'PT25M',
      recipeYield: '4',
      recipeIngredient: ['800 g de potiron', '1 oignon'],
      recipeInstructions: ['Couper le potiron.', 'Mixer avec du bouillon.'],
    },
  };
  const hash = `#import-recipe=${toBase64Url(JSON.stringify(payload))}`;
  const draft = decodeBookmarkletImportHash(hash);
  assert.ok(draft);
  assert.equal(draft.title, 'Velouté de potiron');
  assert.equal(draft.extractionMethod, 'bookmarklet');
  assert.equal(draft.ingredients.length, 2);
  assert.equal(draft.steps.length, 2);

  assert.equal(decodeBookmarkletImportHash('#import-recipe=not-valid-base64!!!'), null);
  assert.equal(decodeBookmarkletImportHash('#other-hash'), null);

  const href = buildBookmarkletHref('https://eimerej00.github.io/miam-planner/');
  assert.equal(href.startsWith('javascript:'), true);
});
