import type { Recipe, ScheduleMap } from '../types/index.ts';
import { formatDateKey, addDays } from '../utils/planGenerator.ts';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Gratin de courgettes au parmesan',
    cuisineType: 'végétarien',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 25,
    servings: 4,
    ingredients: [
      { id: 'i1-1', name: 'Courgettes', amount: 4, unit: 'pièces', category: 'legumes' },
      { id: 'i1-2', name: 'Crème fraîche', amount: 200, unit: 'cl', category: 'frais' },
      { id: 'i1-3', name: 'Parmesan râpé', amount: 80, unit: 'g', category: 'frais' },
      { id: 'i1-4', name: 'Ail', amount: 2, unit: 'gousses', category: 'legumes' },
      { id: 'i1-5', name: 'Huile d’olive', amount: 2, unit: 'c. à soupe', category: 'epicerie' },
    ],
    steps: [
      'Laver et couper les courgettes en rondelles fines.',
      'Faire revenir les courgettes avec l’ail émincé dans un filet d’huile d’olive pendant 8 min.',
      'Disposer dans un plat à gratin, napper de crème, saler, poivrer et saupoudrer généreusement de parmesan.',
      'Enfourner à 190°C pendant 20 minutes jusqu’à belle coloration dorée.',
    ],
    tags: ['végétarien', 'four', 'enfants'],
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'rec-2',
    title: 'Pavé de saumon rôti et purée de patates douces',
    cuisineType: 'poisson',
    category: 'plat',
    prepDuration: 'moyen',
    prepMinutes: 35,
    servings: 4,
    ingredients: [
      { id: 'i2-1', name: 'Pavés de saumon', amount: 4, unit: 'pièces', category: 'viandes' },
      { id: 'i2-2', name: 'Patates douces', amount: 800, unit: 'g', category: 'legumes' },
      { id: 'i2-3', name: 'Beurre demi-sel', amount: 30, unit: 'g', category: 'frais' },
      { id: 'i2-4', name: 'Lait entier', amount: 100, unit: 'ml', category: 'frais' },
      { id: 'i2-5', name: 'Citron bio', amount: 1, unit: 'pièce', category: 'legumes' },
    ],
    steps: [
      'Éplucher et couper les patates douces en cubes, cuire 20 min dans l’eau bouillante salée.',
      'Écraser en purée onctueuse avec le beurre et le lait tiédi.',
      'Déposer les pavés de saumon sur une plaque de cuisson, assaisonner avec filet de citron et aneth.',
      'Cuire au four à 180°C pendant 12 à 14 minutes.',
    ],
    tags: ['poisson', 'omégas', 'équilibré'],
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'rec-3',
    title: 'Curry doux de lentilles corail au lait de coco',
    cuisineType: 'végétarien',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 25,
    servings: 4,
    ingredients: [
      { id: 'i3-1', name: 'Lentilles corail', amount: 250, unit: 'g', category: 'epicerie' },
      { id: 'i3-2', name: 'Lait de coco', amount: 400, unit: 'ml', category: 'epicerie' },
      { id: 'i3-3', name: 'Tomates concassées', amount: 400, unit: 'g', category: 'epicerie' },
      { id: 'i3-4', name: 'Oignon jaune', amount: 1, unit: 'pièce', category: 'legumes' },
      { id: 'i3-5', name: 'Pâte de curry doux', amount: 1, unit: 'c. à soupe', category: 'epicerie' },
      { id: 'i3-6', name: 'Épinards frais', amount: 100, unit: 'g', category: 'legumes' },
    ],
    steps: [
      'Faire suer l’oignon émincé dans une sauteuse.',
      'Ajouter la pâte de curry et faire torréfier 1 minute.',
      'Verser les lentilles rincées, le lait de coco et les tomates concassées.',
      'Laisser mijoter 18 minutes à feu doux puis incorporer les pousses d’épinards.',
    ],
    tags: ['végétarien', 'réconfort', 'épices'],
    createdAt: '2026-10-03T10:00:00Z',
  },
  {
    id: 'rec-4',
    title: 'Quiche épinards et chèvre frais',
    cuisineType: 'convivial',
    category: 'plat',
    prepDuration: 'moyen',
    prepMinutes: 40,
    servings: 4,
    ingredients: [
      { id: 'i4-1', name: 'Pâte brisée pur beurre', amount: 1, unit: 'rouleau', category: 'frais' },
      { id: 'i4-2', name: 'Épinards hachés', amount: 300, unit: 'g', category: 'surgeles' },
      { id: 'i4-3', name: 'Bûche de chèvre', amount: 150, unit: 'g', category: 'frais' },
      { id: 'i4-4', name: 'Œufs frais', amount: 3, unit: 'pièces', category: 'frais' },
      { id: 'i4-5', name: 'Crème liquide', amount: 200, unit: 'ml', category: 'frais' },
    ],
    steps: [
      'Foncer un moule à tarte avec la pâte brisée et piquer le fond.',
      'Battre les œufs avec la crème, sel, poivre et muscade.',
      'Répartir les épinards égouttés et les rondelles de chèvre.',
      'Verser l’appareil et enfourner 35 minutes à 180°C.',
    ],
    tags: ['boulangerie', 'familial', 'facile'],
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'rec-5',
    title: 'Poulet mijoté au citron confit et olives',
    cuisineType: 'classique',
    category: 'plat',
    prepDuration: 'long',
    prepMinutes: 50,
    servings: 4,
    ingredients: [
      { id: 'i5-1', name: 'Cuisses de poulet fermier', amount: 4, unit: 'pièces', category: 'viandes' },
      { id: 'i5-2', name: 'Citron confit', amount: 1, unit: 'pièce', category: 'epicerie' },
      { id: 'i5-3', name: 'Olives vertes dénoyautées', amount: 100, unit: 'g', category: 'epicerie' },
      { id: 'i5-4', name: 'Oignons', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i5-5', name: 'Gingembre et curcuma', amount: 1, unit: 'c. à café', category: 'epicerie' },
    ],
    steps: [
      'Dorer les morceaux de poulet dans une cocotte en fonte.',
      'Ajouter les oignons émincés et les épices.',
      'Mouiller avec 20 cl d’eau tiède, ajouter le citron confit en quartiers.',
      'Laisser mijoter à couvert pendant 40 minutes, ajouter les olives 10 min avant la fin.',
    ],
    tags: ['viande', 'mijoté', 'saveurs'],
    createdAt: '2026-10-05T10:00:00Z',
  },
  {
    id: 'rec-6',
    title: 'Risotto crémeux aux champignons',
    cuisineType: 'classique',
    category: 'plat',
    prepDuration: 'moyen',
    prepMinutes: 35,
    servings: 4,
    ingredients: [
      { id: 'i6-1', name: 'Riz arborio', amount: 300, unit: 'g', category: 'epicerie' },
      { id: 'i6-2', name: 'Champignons de Paris', amount: 350, unit: 'g', category: 'legumes' },
      { id: 'i6-3', name: 'Bouillon de légumes', amount: 1, unit: 'litre', category: 'epicerie' },
      { id: 'i6-4', name: 'Échalotes', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i6-5', name: 'Parmesan', amount: 60, unit: 'g', category: 'frais' },
      { id: 'i6-6', name: 'Vin blanc sec', amount: 80, unit: 'ml', category: 'epicerie' },
    ],
    steps: [
      'Faire suer les échalotes et les champignons dorés séparément.',
      'Nacrer le riz dans un peu d’huile, déglacer au vin blanc.',
      'Verser le bouillon louche après louche pendant 18 minutes en remuant.',
      'Lier hors du feu avec le parmesan et une noix de beurre.',
    ],
    tags: ['italien', 'crémeux', 'dimanche'],
    createdAt: '2026-10-06T10:00:00Z',
  },
  {
    id: 'rec-7',
    title: 'Wok de nouilles sautées et légumes croquants',
    cuisineType: 'rapide',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 20,
    servings: 4,
    ingredients: [
      { id: 'i7-1', name: 'Nouilles aux œufs', amount: 250, unit: 'g', category: 'epicerie' },
      { id: 'i7-2', name: 'Carottes', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i7-3', name: 'Poivron rouge', amount: 1, unit: 'pièce', category: 'legumes' },
      { id: 'i7-4', name: 'Sauce soja', amount: 3, unit: 'c. à soupe', category: 'epicerie' },
      { id: 'i7-5', name: 'Huile de sésame', amount: 1, unit: 'c. à soupe', category: 'epicerie' },
    ],
    steps: [
      'Cuire les nouilles 3 minutes, égoutter et rincer à l’eau froide.',
      'Tailler les carottes et le poivron en fins bâtonnets.',
      'Sauter les légumes vivement au wok pendant 5 minutes pour garder le croquant.',
      'Ajouter les nouilles, la sauce soja et l’huile de sésame, mélanger 2 minutes.',
    ],
    tags: ['asiatique', 'express', 'croquant'],
    createdAt: '2026-10-07T10:00:00Z',
  },
  {
    id: 'rec-8',
    title: 'Lasagnes maison aux légumes du soleil',
    cuisineType: 'convivial',
    category: 'plat',
    prepDuration: 'long',
    prepMinutes: 60,
    servings: 4,
    ingredients: [
      { id: 'i8-1', name: 'Feuilles de lasagnes', amount: 250, unit: 'g', category: 'epicerie' },
      { id: 'i8-2', name: 'Aubergines et courgettes', amount: 500, unit: 'g', category: 'legumes' },
      { id: 'i8-3', name: 'Sauce tomate cuisinée', amount: 600, unit: 'g', category: 'epicerie' },
      { id: 'i8-4', name: 'Béchamel maison', amount: 400, unit: 'ml', category: 'frais' },
      { id: 'i8-5', name: 'Mozzarella râpée', amount: 150, unit: 'g', category: 'frais' },
    ],
    steps: [
      'Faire griller les légumes en dés à la poêle avec origan.',
      'Alterner dans un plat à four les couches de sauce, lasagnes, légumes et béchamel.',
      'Terminer par une généreuse couche de mozzarella râpée.',
      'Cuire 35 minutes au four à 180°C.',
    ],
    tags: ['four', 'familial', 'généreux'],
    createdAt: '2026-10-08T10:00:00Z',
  },
  {
    id: 'rec-9',
    title: 'Bowl de quinoa, avocat et pois chiches rôtis',
    cuisineType: 'healthy',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 20,
    servings: 4,
    ingredients: [
      { id: 'i9-1', name: 'Quinoa blanc', amount: 200, unit: 'g', category: 'epicerie' },
      { id: 'i9-2', name: 'Pois chiches cuits', amount: 250, unit: 'g', category: 'epicerie' },
      { id: 'i9-3', name: 'Avocats mûrs', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i9-4', name: 'Fromage féta', amount: 100, unit: 'g', category: 'frais' },
      { id: 'i9-5', name: 'Concombre', amount: 1, unit: 'pièce', category: 'legumes' },
    ],
    steps: [
      'Cuire le quinoa dans deux fois son volume d’eau salée, égoutter.',
      'Faire dorer les pois chiches à la poêle avec paprika et sel pendant 6 min.',
      'Couper les avocats et le concombre en dés.',
      'Dresser les bols avec le quinoa, les crudités, la féta émiettée et une vinaigrette citronnée.',
    ],
    tags: ['frais', 'healthy', 'midi'],
    createdAt: '2026-10-09T10:00:00Z',
  },
  {
    id: 'rec-10',
    title: 'Tartiflette savoyarde au Reblochon',
    cuisineType: 'convivial',
    category: 'plat',
    prepDuration: 'long',
    prepMinutes: 55,
    servings: 4,
    ingredients: [
      { id: 'i10-1', name: 'Pommes de terre à chair ferme', amount: 1, unit: 'kg', category: 'legumes' },
      { id: 'i10-2', name: 'Reblochon fermier AOP', amount: 1, unit: 'pièce', category: 'frais' },
      { id: 'i10-3', name: 'Lardons fumés', amount: 200, unit: 'g', category: 'viandes' },
      { id: 'i10-4', name: 'Oignons jaunes', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i10-5', name: 'Vin blanc de Savoie', amount: 50, unit: 'ml', category: 'epicerie' },
    ],
    steps: [
      'Cuire les pommes de terre avec la peau, les peler puis les couper en rondelles.',
      'Faire rissoler les lardons et les oignons émincés, déglacer au vin blanc.',
      'Mélanger les pommes de terre dans un plat à gratin.',
      'Couper le reblochon en deux dans l’épaisseur et le poser croûte vers le haut.',
      'Cuire 25 min à 200°C jusqu’à ce que le fromage bouillonne.',
    ],
    tags: ['hiver', 'montagne', 'gourmand'],
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'rec-11',
    title: 'Cabillaud en croûte d’herbes et riz basmati',
    cuisineType: 'poisson',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 25,
    servings: 4,
    ingredients: [
      { id: 'i11-1', name: 'Dos de cabillaud', amount: 4, unit: 'portions', category: 'viandes' },
      { id: 'i11-2', name: 'Chapelure fine', amount: 50, unit: 'g', category: 'epicerie' },
      { id: 'i11-3', name: 'Persil et ciboulette', amount: 1, unit: 'botte', category: 'legumes' },
      { id: 'i11-4', name: 'Riz basmati', amount: 240, unit: 'g', category: 'epicerie' },
      { id: 'i11-5', name: 'Moutarde douce', amount: 2, unit: 'c. à café', category: 'epicerie' },
    ],
    steps: [
      'Mixer les herbes avec la chapelure, un peu de beurre fondu et sel.',
      'Badigeonner les dos de poisson d’un voile de moutarde douce.',
      'Appliquer la croûte d’herbes sur le dessus.',
      'Enfourner 15 min à 190°C et servir avec le riz basmati fumant.',
    ],
    tags: ['poisson', 'léger', 'élégant'],
    createdAt: '2026-10-11T10:00:00Z',
  },
  {
    id: 'rec-12',
    title: 'Frittata aux poivrons et mozzarella',
    cuisineType: 'végétarien',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 20,
    servings: 4,
    ingredients: [
      { id: 'i12-1', name: 'Œufs frais', amount: 6, unit: 'pièces', category: 'frais' },
      { id: 'i12-2', name: 'Poivron jaune et rouge', amount: 2, unit: 'pièces', category: 'legumes' },
      { id: 'i12-3', name: 'Mozzarella fraîche', amount: 125, unit: 'g', category: 'frais' },
      { id: 'i12-4', name: 'Oignon rouge', amount: 1, unit: 'pièce', category: 'legumes' },
      { id: 'i12-5', name: 'Basilic frais', amount: 6, unit: 'feuilles', category: 'legumes' },
    ],
    steps: [
      'Faire suer les poivrons en lanières et l’oignon rouge dans une poêle allant au four.',
      'Battre les œufs avec sel, poivre et basilic ciselé.',
      'Verser sur les poivrons, parsemer de morceaux de mozzarella.',
      'Cuire 5 min à la poêle puis passer 5 min sous le grill du four.',
    ],
    tags: ['œufs', 'express', 'soleil'],
    createdAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'rec-13',
    title: 'Tagliatelles à la crème de potimarron',
    cuisineType: 'végétarien',
    category: 'plat',
    prepDuration: 'rapide',
    prepMinutes: 25,
    servings: 4,
    ingredients: [
      { id: 'i13-1', name: 'Tagliatelles fraîches', amount: 400, unit: 'g', category: 'frais' },
      { id: 'i13-2', name: 'Purée de potimarron', amount: 300, unit: 'g', category: 'legumes' },
      { id: 'i13-3', name: 'Crème fraîche épaisse', amount: 100, unit: 'g', category: 'frais' },
      { id: 'i13-4', name: 'Noisettes concassées', amount: 40, unit: 'g', category: 'epicerie' },
      { id: 'i13-5', name: 'Sauge fraîche', amount: 4, unit: 'feuilles', category: 'legumes' },
    ],
    steps: [
      'Cuire les tagliatelles dans l’eau bouillante selon indications.',
      'Faire tiédir la purée de potimarron avec la crème et la sauge.',
      'Torréfier les noisettes concassées à sec dans une petite poêle.',
      'Mélanger les pâtes à la crème orangée et parsemer de noisettes croquantes.',
    ],
    tags: ['pâtes', 'automne', 'douceur'],
    createdAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'rec-14',
    title: 'Blanquette de veau à l’ancienne',
    cuisineType: 'classique',
    category: 'plat',
    prepDuration: 'long',
    prepMinutes: 75,
    servings: 4,
    ingredients: [
      { id: 'i14-1', name: 'Épaule de veau coupée en morceaux', amount: 800, unit: 'g', category: 'viandes' },
      { id: 'i14-2', name: 'Carottes', amount: 3, unit: 'pièces', category: 'legumes' },
      { id: 'i14-3', name: 'Poireau', amount: 1, unit: 'pièce', category: 'legumes' },
      { id: 'i14-4', name: 'Champignons de Paris', amount: 200, unit: 'g', category: 'legumes' },
      { id: 'i14-5', name: 'Crème et jaune d’œuf', amount: 1, unit: 'liaison', category: 'frais' },
    ],
    steps: [
      'Faire pocher la viande dans de l’eau avec carottes, poireau et bouquet garni 1h.',
      'Faire un roux blanc avec le bouillon filtré.',
      'Ajouter la viande et les champignons préalablement dorés.',
      'Lier la sauce avec le jaune d’œuf battu dans la crème hors du feu.',
    ],
    tags: ['tradition', 'dimanche', 'terroir'],
    createdAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'rec-15',
    title: 'Dahl doux de pois cassés et épinards',
    cuisineType: 'végétarien',
    category: 'plat',
    prepDuration: 'moyen',
    prepMinutes: 40,
    servings: 4,
    ingredients: [
      { id: 'i15-1', name: 'Pois cassés', amount: 250, unit: 'g', category: 'epicerie' },
      { id: 'i15-2', name: 'Tomates pelées', amount: 400, unit: 'g', category: 'epicerie' },
      { id: 'i15-3', name: 'Lait de coco', amount: 200, unit: 'ml', category: 'epicerie' },
      { id: 'i15-4', name: 'Graines de cumin', amount: 1, unit: 'c. à café', category: 'epicerie' },
      { id: 'i15-5', name: 'Épinards', amount: 150, unit: 'g', category: 'legumes' },
    ],
    steps: [
      'Cuire les pois cassés dans l’eau bouillante environ 30 minutes.',
      'Dans une cocotte, chauffer les graines de cumin dans un filet d’huile.',
      'Ajouter les tomates, les pois cassés cuits et le lait de coco.',
      'Laisser mijoter 10 min et ajouter les pousses d’épinards avant de servir.',
    ],
    tags: ['légumineuses', 'végétarien', 'épices'],
    createdAt: '2026-10-15T10:00:00Z',
  },
];

export function getInitialSchedule(): ScheduleMap {
  const schedule: ScheduleMap = {};
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));

  interface SampleSlot {
    midi?: string;
    soir?: string;
    midiExt?: boolean;
    midiLabel?: string;
    soirExt?: boolean;
    soirLabel?: string;
    midiEntree?: string;
    midiAccomp?: string;
    soirEntree?: string;
    soirAccomp?: string;
  }

  const sampleAssignments: SampleSlot[] = [
    { midi: 'rec-1', soir: 'rec-2', midiEntree: 'Carottes râpées citronnées' },
    { midi: 'rec-3', soir: 'rec-4', soirAccomp: 'Salade verte croquante' },
    { midiExt: true, midiLabel: 'Cantine scolaire', soir: 'rec-5' },
    { midi: 'rec-6', soir: 'rec-7', midiAccomp: 'Riz basmati' },
    { midi: 'rec-9', soirExt: true, soirLabel: 'Pizzeria en famille' },
    { midi: 'rec-11', soir: 'rec-10', midiEntree: 'Velouté de potimarron' },
    { midi: 'rec-14', soir: 'rec-12', midiAccomp: 'Riz pilaf' },
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = formatDateKey(d);
    const sample = sampleAssignments[i];

    schedule[key] = {
      date: key,
      midi: {
        isExterior: !!sample.midiExt,
        exteriorLabel: sample.midiLabel,
        recipeId: sample.midi,
        entree: sample.midiEntree,
        accompagnement: sample.midiAccomp,
      },
      soir: {
        isExterior: !!sample.soirExt,
        exteriorLabel: sample.soirLabel,
        recipeId: sample.soir,
        entree: sample.soirEntree,
        accompagnement: sample.soirAccomp,
      },
    };
  }

  return schedule;
}
