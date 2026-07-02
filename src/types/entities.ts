// ─────────────────────────────────────────────────────────────────────────────
// Tipus de les entitats del domini.
//
// Aquest fitxer és part de la única font de veritat dels tipus de l'app. Veure el
// document PLA.md (secció 5) per al context complet.
// ─────────────────────────────────────────────────────────────────────────────

// ── primitius ───────────────────────────────────────────────────────────────
export type ID = string; // UUID v7 (ordenable per temps)
export type ISOTimestamp = string;
export type DeviceID = string;
export type UserName = string; // nom lliure visible, NO un compte

export type StockType = 'food' | 'consumable' | 'tools' | 'other';
export type QuantityType = 'units' | 'kg' | 'L';

export type FoodCategory =
  | 'fridge'
  | 'snacks'
  | 'canned'
  | 'fruit'
  | 'vegetables'
  | 'breakfast'
  | 'dessert'
  | 'water'
  | 'drink'
  | 'other';

/**
 * Gestió de caducitat (només menjar).
 * - `never`: no caduca.
 * - `days_from_purchase`: caduca N dies després de la compra (p.ex. conserva: 365).
 * - `define_on_add`: la data es defineix en cada compra (p.ex. iogurt amb data impresa).
 */
export type ExpiryPolicy =
  | { mode: 'never' }
  | { mode: 'days_from_purchase'; days: number }
  | { mode: 'define_on_add' };

// ── llocs d'estiva ───────────────────────────────────────────────────────────
/**
 * Estància del vaixell on s'agrupen els llocs. Llista fixa al codi; la definició
 * completa (icona, foto) viu a `features/locations/rooms.ts`.
 */
export type RoomId =
  | 'salon'
  | 'kitchen'
  | 'cabin_bow'
  | 'cabin_starboard'
  | 'cabin_port'
  | 'bathroom'
  | 'deck'
  | 'other'; // estància "Altres": llocs sense estància assignada

export interface StowageLocation {
  id: ID;
  name: string;
  description?: string;
  photoPath?: string; // ruta a Supabase Storage
  room?: RoomId; // estància del vaixell on és el lloc (llista fixa, veure features/locations/rooms.ts)
  parentId?: ID | null; // jerarquia opcional (no obligatòria)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── definició d'objecte (el catàleg) ─────────────────────────────────────────
export interface ItemObject {
  id: ID;
  name: string;
  icon?: string; // emoji o clau d'icona
  stockType: StockType;
  quantityType: QuantityType;
  usualLocationIds: ID[]; // només informatiu — l'estoc NO és per lloc
  foodCategory?: FoodCategory; // només menjar
  expiry?: ExpiryPolicy; // només menjar
  trackDuration?: boolean; // opt-in estimació de durada (gas, cafè…)
  capacityLiters?: number; // només aigua: litres per unitat (ampolla) — per estimar durada
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── receptes ─────────────────────────────────────────────────────────────────
export interface RecipeIngredient {
  objectId: ID;
  quantityPerPerson: number; // es multiplica per N comensals en cuinar
}

export interface Recipe {
  id: ID;
  title: string;
  ingredients: RecipeIngredient[];
  prepTimeMinutes?: number;
  needsCooking?: boolean; // cal foc
  steps?: string[]; // passos enumerats
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── checklists ───────────────────────────────────────────────────────────────
// La PLANTILLA se sincronitza. El PROGRÉS és LOCAL i mai se sincronitza.
export interface ChecklistItem {
  id: ID;
  label: string;
}

export interface ChecklistTemplate {
  id: ID;
  title: string;
  icon?: string; // clau Iconify (mateix selector que els objectes)
  items: ChecklistItem[];
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ChecklistProgress {
  // store local de Dexie, NO un esdeveniment
  templateId: ID;
  checkedItemIds: ID[];
  updatedAt: ISOTimestamp;
}

// ── inventari derivat (MAI autoritzat; resultat del fold, en cau) ─────────────
export interface ExpiryLot {
  lotId: ID;
  addedAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
  quantity: number; // restant d'aquest lot
}

export interface InventoryEntry {
  objectId: ID;
  quantity: number; // sempre >= 0
  lots?: ExpiryLot[]; // només menjar amb caducitat; consum FIFO
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
// No són objectes d'inventari: es consumeixen de forma contínua i es mesuren de forma
// absoluta (% de nivell, comptador, pes), no per deltes additius. Tenen un domini propi
// paral·lel a l'inventari. Veure src/domain/resources/.
export type ResourceKind = 'fuel' | 'water' | 'gas';
export type WaterTank = 'proa' | 'popa';

/**
 * Configuració sincronitzada d'un recurs (singleton per `kind`; `kind` fa també d'id).
 * Last-writer-wins per `updatedAt`, com els altres `*_upsert`. Només el bloc del propi
 * `kind` és rellevant; els altres queden undefined.
 */
export interface ResourceConfig {
  kind: ResourceKind; // també fa d'id
  fuel?: { capacityLiters: number };
  water?: { proaLiters: number; popaLiters: number };
  gas?: { fullKg: number; emptyKg: number; netKg: number }; // p.ex. 6.55 / 3.8 / 2.75
  updatedAt: ISOTimestamp;
}

/**
 * Estat derivat d'un recurs (CAU, com InventoryEntry; resultat del fold de mesures).
 * `percent` és 0..100, o null si encara no hi ha config o mesura suficient.
 */
export interface ResourceState {
  kind: ResourceKind;
  percent: number | null;
  // gasoil
  fuelLiters?: number;
  // aigua
  waterProaLiters?: number;
  waterPopaLiters?: number;
  waterTotalLiters?: number;
  activeTank?: WaterTank;
  lastCounter?: number;
  // gas
  gasWeightKg?: number;
  // comú
  lastMeasuredAt?: ISOTimestamp;
}

// ── documentació tècnica del veler ────────────────────────────────────────────
// Un document (inspecció tècnica, homologació, títol, abanderament, duanes…) NO es
// guarda com a entitat amb estat: es DERIVA del log com tota la resta. El `docId` és
// l'id del propi `document_create`. Veure src/domain/documents/.

/** Categoria d'un document (llista fixa al codi). */
export type DocCategory =
  | 'inspection' // inspecció tècnica
  | 'homologation' // certificats d'homologació
  | 'safety' // revisió del material de seguretat
  | 'license' // títols dels patrons
  | 'registration' // certificat d'abanderament
  | 'customs' // duanes
  | 'insurance' // assegurança
  | 'other'; // altres

/** Les categories en ordre de presentació. */
export const DOC_CATEGORIES: DocCategory[] = [
  'inspection',
  'homologation',
  'safety',
  'license',
  'registration',
  'customs',
  'insurance',
  'other',
];

/**
 * Dades d'una versió d'un document (snapshot que viatja als events de creació/renovació).
 * Tots els camps són opcionals: alguns documents no caduquen, no tenen referència, etc.
 */
export interface DocVersionData {
  validUntil?: ISOTimestamp; // data de validesa (si aplica) — clau per a l'avís de caducitat
  issuedAt?: ISOTimestamp; // data d'emissió
  reference?: string; // número / referència
  issuer?: string; // entitat emissora
  physicalLocation?: string; // on és l'original físic
  filePath?: string; // ruta a Storage del fitxer digital (opcional)
}

// ── guia del vaixell ───────────────────────────────────────────────────────────
// La guia de la tripulació (manual de consulta ràpida) és editable des de l'app quan el
// mode edició està desbloquejat. Cada secció és un snapshot autònom (sense versions ni
// historial): es DERIVA del log com les definicions, amb `guide_upsert`/`guide_delete`
// (last-writer-wins). Veure src/domain/guide/.

/**
 * Una peça de contingut dins d'una secció de la guia.
 * - `heading`: subtítol dins la secció.
 * - `paragraph`: text corregut.
 * - `note`: avís/consell destacat (caixa groga).
 * - `steps`: llista numerada (un ítem per pas).
 * - `list`: llista amb pics.
 * - `image`: `src` és una ruta de photoQueue ('guides/<id>/<uuid>.jpg') O una ruta
 *   estàtica llegada de public/guide/ ('guide/x.jpg').
 */
export type GuideBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; src: string; caption?: string };

/** Un tema de la guia. Es deriva del log; `order` en fixa la posició a l'índex. */
export interface GuideSection {
  id: ID;
  title: string;
  icon?: string; // clau Iconify (com ItemObject.icon; p.ex. 'tabler:anchor'); buit = reserva
  blocks: GuideBlock[];
  order: number; // posició a l'índex (ordre: order, després createdAt, després id)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  deleted?: boolean; // tombstone; fora de la llista visible
}
