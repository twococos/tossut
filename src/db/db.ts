import Dexie, { type Table } from 'dexie';
import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ChecklistProgress,
  InventoryEntry,
  ResourceConfig,
  ResourceState,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';
import type { GuideSection } from '@/types/entities';
import type { DerivedFault } from '@/domain/faults/deriveFaults';
import type { DerivedShoppingItem } from '@/domain/shopping/deriveShoppingList';
import type { DerivedDocument } from '@/domain/documents/deriveDocuments';

/** Estat de sincronització d'una fila d'esdeveniment local. */
export type Pending = 0 | 1;

/** Fila d'esdeveniment a Dexie: l'AppEvent + metadades locals de sync. */
export type LocalEvent = AppEvent & {
  _pending: Pending; // 1 = encara no confirmat pel servidor
  _serverSeq?: number; // ordre global assignat pel servidor (un cop sincronitzat)
};

/** Fitxer pendent de pujar (fet/triat offline): foto o document (PDF/imatge). */
export interface PendingPhoto {
  id: string;
  blob: Blob;
  targetType: 'object' | 'location' | 'app' | 'fault' | 'document' | 'guide';
  targetId: string;
  createdAt: string;
  mime?: string; // contentType real per pujar (per defecte image/jpeg)
  ext?: string; // extensió de la ruta a Storage (per defecte jpg)
}

/** Metadades de sincronització (una sola fila amb key 'sync'). */
export interface SyncMeta {
  key: string; // 'sync'
  lastServerSeq: number; // marca d'aigua de l'últim esdeveniment baixat
  lastSyncedAt?: string;
  deviceId: string;
  localSeq: number; // comptador monòton per dispositiu
  lastSyncError?: string; // últim error de sync capturat (per al diagnòstic dins l'app)
  lastSyncErrorAt?: string; // quan es va capturar l'últim error
}

/**
 * Base de dades local (IndexedDB via Dexie).
 *
 * `events` és la còpia local del log append-only I la cua de pendents (`_pending=1`).
 * `inventory` i les taules de definició són CAUS derivades del log (es reescriuen a
 * cada recompute) — mai són font de veritat. `checklistProgress` és l'únic store
 * realment local i mai sincronitzat. Veure PLA.md (secció 7).
 */
export class BoatDB extends Dexie {
  events!: Table<LocalEvent, string>;
  objects!: Table<ItemObject, string>;
  locations!: Table<StowageLocation, string>;
  recipes!: Table<Recipe, string>;
  checklistTemplates!: Table<ChecklistTemplate, string>;
  checklistProgress!: Table<ChecklistProgress, string>; // LOCAL ONLY
  inventory!: Table<InventoryEntry, string>; // CAU derivada
  resourceConfigs!: Table<ResourceConfig, string>; // CAU derivada (recursos continus)
  resourceStates!: Table<ResourceState, string>; // CAU derivada (recursos continus)
  faults!: Table<DerivedFault, string>; // CAU derivada (avaries)
  shoppingItems!: Table<DerivedShoppingItem, string>; // CAU derivada (llista de la compra)
  documents!: Table<DerivedDocument, string>; // CAU derivada (documentació tècnica)
  guideSections!: Table<GuideSection, string>; // CAU derivada (guia del vaixell)
  pendingPhotos!: Table<PendingPhoto, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super('boat-stock-manager');
    this.version(1).stores({
      events:
        'id, _pending, _serverSeq, occurredAt, [occurredAt+deviceId+seq], type',
      objects: 'id, stockType, foodCategory, name',
      locations: 'id, parentId, name',
      recipes: 'id, title',
      checklistTemplates: 'id, title',
      checklistProgress: 'templateId',
      inventory: 'objectId',
      pendingPhotos: 'id',
      meta: 'key',
    });
    // v2: caus derivades dels recursos continus (gasoil, aigua de tancs, gas). Són
    // projeccions del log (es regeneren a cada recompute), per això no cal migració de
    // dades: només declarar els nous stores.
    this.version(2).stores({
      resourceConfigs: 'kind',
      resourceStates: 'kind',
    });
    // v3: cau derivada de les avaries (projecció del log; es regenera a cada recompute,
    // per això no cal migració de dades, només declarar el store nou).
    this.version(3).stores({
      faults: 'id, severity, resolved',
    });
    // v4: cau derivada de la llista de la compra (projecció del log; es regenera a cada
    // recompute, només cal declarar el store nou). Clau primària = objectId (agregat).
    this.version(4).stores({
      shoppingItems: 'objectId',
    });
    // v5: cau derivada de la documentació tècnica (projecció del log; es regenera a cada
    // recompute, només cal declarar el store nou).
    this.version(5).stores({
      documents: 'id, category, deleted',
    });
    // v6: cau derivada de la guia del vaixell (projecció del log; es regenera a cada
    // recompute, només cal declarar el store nou). Ordre a la vista per l'índex `order`.
    this.version(6).stores({
      guideSections: 'id, order, deleted',
    });
  }
}

export const db = new BoatDB();
