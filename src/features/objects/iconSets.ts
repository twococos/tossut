// ─────────────────────────────────────────────────────────────────────────────
// Catàleg d'icones per al selector d'objectes (Iconify, mode OFFLINE).
//
// Per què Iconify offline: el camp `ItemObject.icon` és una string i Iconify dibuixa
// per clau (`tabler:apple`), així que encaixa sense tocar el model ni els esdeveniments.
// En mode offline les icones surten de paquets JSON locals (cap API, cap xarxa) → PWA.
//
// Pes: registrar els sets sencers a l'arrencada inflaria el bundle inicial. En comptes
// d'això, `loadIconSets()` fa un import() DINÀMIC (chunk separat, lazy) que només
// s'executa quan algú obre el selector o renderitza una icona Iconify per primer cop.
//
//   · Tabler        → set complet (~6.200 icones, ~330 KB gz) via @iconify-json/tabler
//   · Game Icons    → subconjunt curat (192 icones, ~130 KB gz) generat per
//                     scripts/build-game-icons-subset.mjs → gameIconsSubset.json
//
// Les CLAUS desades (`tabler:…`, `game-icons:…`) NO s'han de canviar un cop publicades.
// ─────────────────────────────────────────────────────────────────────────────
import { addCollection } from '@iconify/react/offline';
import type { IconifyJSON } from '@iconify/react';
import { normalizeText as norm } from '@/lib/format';

/** Una entrada del catàleg navegable. */
export interface IconEntry {
  /** Clau Iconify completa, p.ex. `tabler:apple`. És el valor desat a `icon`. */
  key: string;
  /** Tokens de cerca normalitzats (nom de la icona + sinònims en català). */
  tokens: string[];
}

/**
 * Sinònims català/anglès → fragment del nom d'icona. Només per als termes habituals;
 * la resta es cerca pel nom anglès de la pròpia icona (`apple`, `anchor`, `wrench`…).
 * Es comparen normalitzats (sense accents).
 */
const SYNONYMS: Record<string, string[]> = {
  // fruita
  poma: ['apple'], platan: ['banana'], banana: ['banana'], cirera: ['cherry'],
  raim: ['grape', 'grapes'], maduixa: ['strawberry'], gerd: ['raspberry', 'berry'],
  baia: ['berry', 'berries'], pinya: ['pineapple'], llimona: ['lemon'],
  taronja: ['orange', 'citrus'], pera: ['pear'], pressec: ['peach'], kiwi: ['kiwi'],
  oliva: ['olive'], alvocat: ['avocado'], coco: ['coconut'], fruita: ['fruit'],
  // verdura i tubercles
  pastanaga: ['carrot'], tomaquet: ['tomato'], patata: ['potato'], ceba: ['onion'],
  all: ['garlic'], pebrot: ['pepper'], bolet: ['mushroom'], xampinyo: ['mushroom'],
  brocoli: ['broccoli'], col: ['cabbage'], remolatxa: ['beet'], porro: ['leek'],
  carbassa: ['pumpkin'],
  // cereals, llegums, fruita seca
  arros: ['rice'], blat: ['wheat', 'grain'], cereal: ['grain', 'wheat'], gra: ['grain'],
  farina: ['flour'], pasta: ['noodle', 'spaghetti'], fideus: ['noodle'],
  llegum: ['bean', 'jelly-beans'], mongeta: ['bean'], cigro: ['bean'], llentia: ['bean'],
  fruitseca: ['peanut', 'almond', 'nut', 'chestnut'], cacauet: ['peanut'],
  ametlla: ['almond'], llavor: ['seed', 'seedling'], pinyol: ['seed'],
  // proteïna
  carn: ['meat', 'steak', 'beef'], vedella: ['beef', 'steak'], pernil: ['ham'],
  cansalada: ['bacon'], salsitxa: ['sausage'], pollastre: ['chicken', 'drumstick'],
  peix: ['fish'], gamba: ['shrimp'], cranc: ['crab'], pop: ['octopus'], calamar: ['squid'],
  marisc: ['shrimp', 'crab', 'oyster'], ou: ['egg'],
  // làctics, pa, dolços
  formatge: ['cheese'], llet: ['milk'], mantega: ['butter'], pa: ['bread', 'baguette'],
  croissant: ['croissant'], massa: ['dough'], galeta: ['cookie'],
  pastis: ['cake', 'cupcake', 'pie'], dolc: ['candy', 'donut', 'lollipop', 'chocolate'],
  xocolata: ['chocolate'], caramel: ['candy', 'lollipop'], gelat: ['ice-cream'],
  // condiments i bàsics de rebost
  sal: ['salt'], especies: ['spice', 'herb'], herbes: ['herb', 'spice'], sucre: ['sugar'],
  mel: ['honey'], oli: ['oil'], pols: ['powder'],
  // plats preparats
  pizza: ['pizza'], entrepa: ['sandwich'], hamburguesa: ['hamburger', 'burger'],
  sopa: ['soup', 'bowl'], amanida: ['salad'], olla: ['cooking-pot', 'cauldron'],
  cuinar: ['cooking-pot', 'cook'],
  // beguda
  aigua: ['water', 'glass-water', 'bottle'], cafe: ['coffee'], te: ['tea', 'teapot'],
  cervesa: ['beer'], vi: ['wine'], copa: ['wine', 'martini'], coctel: ['martini', 'cocktail'],
  refresc: ['soda', 'cup-soda'], suc: ['juice'],
  // recipients, pots i conserves
  ampolla: ['bottle'], pot: ['jar', 'can', 'cannister'], conserva: ['canned', 'jar', 'can'],
  llauna: ['can', 'canned'], barril: ['barrel'], bidon: ['jerrycan', 'gallon', 'drum'],
  garrafa: ['gallon', 'waterskin'], sac: ['sack', 'knapsack', 'bag'],
  bossa: ['bag', 'duffel'], cantimplora: ['flask', 'waterskin'],
  // estris
  cullera: ['spoon'], forquilla: ['fork'], ganivet: ['knife'], plat: ['plate', 'bowl'],
  // nàutica
  ancora: ['anchor'], vela: ['sail', 'sailboat'], veler: ['sailboat'], vaixell: ['boat', 'ship'],
  barca: ['boat', 'sailboat'], corda: ['rope'], salvavides: ['life-buoy', 'buoy', 'life-jacket'],
  brujola: ['compass'], far: ['lighthouse'], rem: ['paddle', 'oar'], timo: ['ship-wheel', 'wheel'],
  // eines i objectes
  clau: ['wrench', 'key', 'spanner'], martell: ['hammer'], tornavis: ['screwdriver'],
  serra: ['saw'], trepant: ['drill'], alicates: ['plier'], cargol: ['screw', 'bolt'],
  caixa: ['box', 'crate', 'toolbox'], eina: ['tool', 'wrench', 'toolbox'],
  motor: ['engine', 'cog', 'gears'], bateria: ['battery'], gasoil: ['fuel', 'gas', 'oil'],
  benzina: ['fuel', 'gas'], bombeta: ['light-bulb', 'bulb'],
  llanterna: ['flashlight', 'torch', 'lantern'], extintor: ['fire-extinguisher'],
  farmaciola: ['first-aid', 'medical'], pastilla: ['pill'], bena: ['bandage'],
  llumins: ['matchbox', 'match'], espelma: ['candle'], foc: ['fire', 'flame', 'campfire'],
  motxilla: ['backpack'], cubell: ['bucket'],
  tenda: ['tent', 'camping'], mapa: ['map'], prismatics: ['binoculars'], radio: ['walkie-talkie', 'radio'],
};

/** Cert un cop els dos sets s'han registrat i el catàleg s'ha construït. */
let loaded = false;

/** Índex navegable complet (es construeix un cop carregats els sets). */
let CATALOG: IconEntry[] = [];

/** Promesa única de càrrega (idempotent: una sola descàrrega per sessió). */
let loadPromise: Promise<void> | null = null;

/** Construeix les entrades de catàleg d'un set a partir dels seus noms. */
function buildEntries(prefix: string, names: string[]): IconEntry[] {
  return names.map((name) => {
    const tokens = new Set<string>();
    // El nom de la icona, sencer i per fragments (apple, fish-hook → fish, hook).
    tokens.add(norm(name));
    for (const part of name.split('-')) if (part) tokens.add(norm(part));
    // Sinònims en català que apunten a algun fragment del nom.
    for (const [cat, targets] of Object.entries(SYNONYMS)) {
      if (targets.some((tgt) => name.includes(tgt))) tokens.add(norm(cat));
    }
    return { key: `${prefix}:${name}`, tokens: [...tokens] };
  });
}

/**
 * Carrega i registra els sets d'icones (lazy, una sola vegada). Crida-la abans de
 * renderitzar icones Iconify o d'obrir el selector. Segura per cridar moltes vegades.
 */
export function loadIconSets(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    // Només el DATA (els JSON pesants) es carrega lazy; el runtime d'Iconify (addCollection,
    // Icon) ja és al bundle perquè el fan servir ObjectIcon/IconPicker des de l'inici.
    const [tablerMod, giMod] = await Promise.all([
      import('@iconify-json/tabler/icons.json'),
      import('./gameIconsSubset.json'),
    ]);
    const tabler = (tablerMod.default ?? tablerMod) as unknown as IconifyJSON;
    const gameIcons = (giMod.default ?? giMod) as unknown as IconifyJSON;

    addCollection(tabler);
    addCollection(gameIcons);

    CATALOG = [
      ...buildEntries('tabler', Object.keys(tabler.icons)),
      ...buildEntries('game-icons', Object.keys(gameIcons.icons)),
    ];
    loaded = true;
  })();
  return loadPromise;
}

/** Nombre màxim de resultats que es retornen (la graella no pot renderitzar-ne milers). */
export const ICON_SEARCH_LIMIT = 120;

/**
 * Cerca al catàleg (accent-insensible). Retorna fins a `ICON_SEARCH_LIMIT` claus.
 * Amb consulta buida retorna un tall inicial (no tot el catàleg).
 * Requereix `loadIconSets()` previ; si no, retorna [].
 */
export function searchIcons(query: string): string[] {
  const q = norm(query.trim());
  if (!q) return CATALOG.slice(0, ICON_SEARCH_LIMIT).map((e) => e.key);

  const starts: string[] = [];
  const contains: string[] = [];
  for (const entry of CATALOG) {
    let matched: 'start' | 'contain' | null = null;
    for (const tok of entry.tokens) {
      if (tok.startsWith(q)) { matched = 'start'; break; }
      if (tok.includes(q)) matched = 'contain';
    }
    if (matched === 'start') starts.push(entry.key);
    else if (matched === 'contain') contains.push(entry.key);
    if (starts.length >= ICON_SEARCH_LIMIT) break;
  }
  // Prioritza coincidències de prefix (més rellevants) i completa amb les de subcadena.
  return [...starts, ...contains].slice(0, ICON_SEARCH_LIMIT);
}

/** Indica si els sets ja s'han carregat (per a l'estat d'spinner del selector). */
export function iconSetsLoaded(): boolean {
  return loaded;
}

/**
 * Migració de les claus curtes del catàleg antic (foodIcons) a claus Iconify, perquè
 * els objectes ja desats conservin la icona. NO afegir-ne de noves: el selector nou
 * desa directament claus `tabler:…` / `game-icons:…`.
 */
export const LEGACY_ICON_MAP: Record<string, string> = {
  apple: 'tabler:apple', banana: 'tabler:banana', cherry: 'tabler:cherry',
  grape: 'tabler:grain', carrot: 'tabler:carrot', citrus: 'tabler:lemon-2',
  leafy: 'tabler:salad', sprout: 'tabler:plant-2', bean: 'tabler:bottle',
  nut: 'tabler:nut', wheat: 'tabler:wheat', egg: 'tabler:egg', eggFried: 'tabler:egg-fried',
  fish: 'tabler:fish', shrimp: 'game-icons:shrimp', beef: 'tabler:meat', ham: 'game-icons:ham-shank',
  drumstick: 'game-icons:chicken-leg', bird: 'tabler:feather', milk: 'tabler:milk',
  croissant: 'game-icons:croissant', cookie: 'tabler:cookie', cake: 'tabler:cake',
  cakeSlice: 'tabler:cake', donut: 'game-icons:donut', candy: 'tabler:candy',
  candyCane: 'tabler:candy', lollipop: 'game-icons:spiral-lollipop',
  popcorn: 'tabler:cookie', iceCream: 'tabler:ice-cream', iceCreamCone: 'tabler:ice-cream-2',
  pizza: 'tabler:pizza', sandwich: 'game-icons:sandwich', hamburger: 'tabler:burger', soup: 'tabler:soup',
  salad: 'tabler:salad', cookingPot: 'game-icons:cooking-pot', coffee: 'tabler:coffee',
  cupSoda: 'tabler:cup', water: 'tabler:glass-full', wine: 'tabler:glass', beer: 'tabler:beer',
  martini: 'game-icons:martini', utensils: 'tabler:tools-kitchen-2',
  utensilsCrossed: 'tabler:tools-kitchen', vegan: 'tabler:salad',
};
