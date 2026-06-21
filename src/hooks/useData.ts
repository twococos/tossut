import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type {
  ID,
  InventoryEntry,
  ItemObject,
  StowageLocation,
  ResourceConfig,
  ResourceKind,
  ResourceState,
} from '@/types/entities';
import { HEADER_LOCATION_ID } from '@/features/locations/headerLocation';
import { ROOM_PHOTO_LOCATION_IDS } from '@/features/locations/rooms';
import type { RoomDef } from '@/features/locations/rooms';

/**
 * Hooks de lectura reactius sobre les caus de Dexie.
 *
 * `useLiveQuery` re-renderitza automàticament quan canvien les dades subjacents (p.ex.
 * després d'un recompute). És tot el "gestor d'estat" que cal per a la dada persistent.
 * Veure PLA.md (secció 11).
 */

export const useObjects = () => useLiveQuery(() => db.objects.toArray(), [], []);

/** IDs reservats (no són llocs reals): capçalera + foto de cada estància. */
const RESERVED_LOCATION_IDS = new Set([HEADER_LOCATION_ID, ...ROOM_PHOTO_LOCATION_IDS]);

/**
 * Llocs d'estiva visibles. Exclou els "llocs" reservats que només transporten fotos
 * sincronitzades (capçalera i fotos d'estància), perquè cap consumidor (llistes,
 * selectors, vista de compartiment) els tracti com a reals.
 */
export const useLocations = () =>
  useLiveQuery(
    () => db.locations.filter((l) => !RESERVED_LOCATION_IDS.has(l.id)).toArray(),
    [],
    [],
  );

/** Lloc reservat que porta la foto de capçalera de la pàgina de Llocs (o undefined). */
export const useHeaderLocation = (): StowageLocation | undefined =>
  useLiveQuery(() => db.locations.get(HEADER_LOCATION_ID), []);

/** Lloc reservat que porta la foto d'una estància (o undefined). */
export const useRoomPhotoLocation = (room: RoomDef | undefined): StowageLocation | undefined =>
  useLiveQuery(
    () => (room ? db.locations.get(room.photoLocationId) : undefined),
    [room?.photoLocationId],
  );

export const useRecipes = () => useLiveQuery(() => db.recipes.toArray(), [], []);
export const useChecklists = () =>
  useLiveQuery(() => db.checklistTemplates.toArray(), [], []);
export const useInventory = () => useLiveQuery(() => db.inventory.toArray(), [], []);
export const useAllEvents = () => useLiveQuery(() => db.events.toArray(), [], []);

/** Mapa objectId → ItemObject, reactiu. */
export function useObjectsMap(): Map<ID, ItemObject> {
  const objects = useObjects();
  return new Map((objects ?? []).map((o) => [o.id, o]));
}

/** Mapa objectId → InventoryEntry, reactiu. */
export function useInventoryMap(): Map<ID, InventoryEntry> {
  const inv = useInventory();
  return new Map((inv ?? []).map((e) => [e.objectId, e]));
}

/** Quantitat actual d'un objecte (0 si no existeix), reactiu. */
export function useQuantity(objectId: ID): number {
  const entry = useLiveQuery(() => db.inventory.get(objectId), [objectId]);
  return entry?.quantity ?? 0;
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
/** Estats derivats de tots els recursos continus, reactiu. */
export const useResourceStates = () =>
  useLiveQuery(() => db.resourceStates.toArray(), [], []);

/** Configs derivades de tots els recursos continus, reactiu. */
export const useResourceConfigs = () =>
  useLiveQuery(() => db.resourceConfigs.toArray(), [], []);

/** Estat d'un recurs concret (o undefined fins que es deriva), reactiu. */
export const useResourceState = (kind: ResourceKind): ResourceState | undefined =>
  useLiveQuery(() => db.resourceStates.get(kind), [kind]);

/** Config d'un recurs concret (o undefined), reactiu. */
export const useResourceConfig = (kind: ResourceKind): ResourceConfig | undefined =>
  useLiveQuery(() => db.resourceConfigs.get(kind), [kind]);

// ── avaries ────────────────────────────────────────────────────────────────────
/** Totes les avaries derivades (actives i resoltes), reactiu. */
export const useFaults = () => useLiveQuery(() => db.faults.toArray(), [], []);

// ── llista de la compra ──────────────────────────────────────────────────────
/** Tots els ítems de la llista de la compra (agregats per objecte), reactiu. */
export const useShoppingItems = () =>
  useLiveQuery(() => db.shoppingItems.toArray(), [], []);

// ── documentació tècnica ───────────────────────────────────────────────────────
/** Tots els documents derivats (actius i eliminats), reactiu. */
export const useDocuments = () => useLiveQuery(() => db.documents.toArray(), [], []);
