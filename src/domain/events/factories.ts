import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ResourceConfig,
  WaterTank,
  ID,
  DocCategory,
  DocVersionData,
  GuideSection,
} from '@/types/entities';
import type {
  StockDeltaEvent,
  StockDeltaLine,
  StockDeltaReason,
  StockBarrierEvent,
  StockBarrierMode,
  OrderKey,
  ObjectUpsertEvent,
  LocationUpsertEvent,
  RecipeUpsertEvent,
  ChecklistUpsertEvent,
  ObjectDeleteEvent,
  LocationDeleteEvent,
  RecipeDeleteEvent,
  ChecklistDeleteEvent,
  ResourceConfigUpsertEvent,
  FuelMeasureEvent,
  WaterMeasureEvent,
  WaterRefillEvent,
  GasMeasureEvent,
  GasSwapEvent,
  FaultSeverity,
  FaultReportEvent,
  FaultUpdateEvent,
  FaultEditEvent,
  FaultTagsEvent,
  FaultResolveEvent,
  FaultReopenEvent,
  FaultBarrierEvent,
  ShoppingAddEvent,
  ShoppingRemoveEvent,
  ShoppingBoughtEvent,
  ShoppingBarrierEvent,
  DocumentCreateEvent,
  DocumentEditEvent,
  DocumentRenewEvent,
  DocumentCommentEvent,
  DocumentCommentDeleteEvent,
  DocumentDeleteEvent,
  DocumentRestoreEvent,
  DocumentBarrierEvent,
  GuideUpsertEvent,
  GuideDeleteEvent,
} from '@/types/events';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

/**
 * Factories d'esdeveniments.
 *
 * El domini és pur: aquestes funcions no fan I/O. El context d'autoria (`deviceId`,
 * `userName`, `seq`) s'injecta com a paràmetre. El `seq` (comptador monòton per
 * dispositiu) i la persistència els resol la capa Dexie (Fase 3); aquí només es
 * construeix l'objecte esdeveniment ben format.
 */
export interface EventContext {
  deviceId: string;
  userName: string;
  seq: number;
  /** Override opcional de la marca de temps (per a tests / seed); per defecte ara. */
  occurredAt?: string;
}

function base(ctx: EventContext) {
  return {
    id: newId(),
    occurredAt: ctx.occurredAt ?? nowISO(),
    deviceId: ctx.deviceId,
    userName: ctx.userName,
    seq: ctx.seq,
    serverSeq: null,
  };
}

// ── deltes d'estoc ───────────────────────────────────────────────────────────
export function makeStockDeltaEvent(
  ctx: EventContext,
  reason: StockDeltaReason,
  lines: StockDeltaLine[],
  extra?: { recipeId?: ID; diners?: number },
): StockDeltaEvent {
  return {
    ...base(ctx),
    type: 'stock_delta',
    reason,
    lines,
    ...(extra?.recipeId !== undefined ? { recipeId: extra.recipeId } : {}),
    ...(extra?.diners !== undefined ? { diners: extra.diners } : {}),
  };
}

// ── barreres de tall (rebobinar / esborrar historial d'estoc) ────────────────
export function makeStockBarrierEvent(
  ctx: EventContext,
  mode: StockBarrierMode,
  cut: OrderKey,
  targetEventId?: ID | null,
): StockBarrierEvent {
  return {
    ...base(ctx),
    type: 'stock_barrier',
    mode,
    cut,
    ...(targetEventId !== undefined ? { targetEventId } : {}),
  };
}

// ── upserts de definició (snapshot complet) ──────────────────────────────────
export function makeObjectUpsertEvent(
  ctx: EventContext,
  payload: ItemObject,
): ObjectUpsertEvent {
  return { ...base(ctx), type: 'object_upsert', payload };
}

export function makeLocationUpsertEvent(
  ctx: EventContext,
  payload: StowageLocation,
): LocationUpsertEvent {
  return { ...base(ctx), type: 'location_upsert', payload };
}

export function makeRecipeUpsertEvent(
  ctx: EventContext,
  payload: Recipe,
): RecipeUpsertEvent {
  return { ...base(ctx), type: 'recipe_upsert', payload };
}

export function makeChecklistUpsertEvent(
  ctx: EventContext,
  payload: ChecklistTemplate,
): ChecklistUpsertEvent {
  return { ...base(ctx), type: 'checklist_upsert', payload };
}

// ── deletes de definició (tombstone) ─────────────────────────────────────────
export function makeObjectDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): ObjectDeleteEvent {
  return { ...base(ctx), type: 'object_delete', targetId };
}

export function makeLocationDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): LocationDeleteEvent {
  return { ...base(ctx), type: 'location_delete', targetId };
}

export function makeRecipeDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): RecipeDeleteEvent {
  return { ...base(ctx), type: 'recipe_delete', targetId };
}

export function makeChecklistDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): ChecklistDeleteEvent {
  return { ...base(ctx), type: 'checklist_delete', targetId };
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
export function makeResourceConfigUpsertEvent(
  ctx: EventContext,
  payload: ResourceConfig,
): ResourceConfigUpsertEvent {
  return { ...base(ctx), type: 'resource_config_upsert', payload };
}

export function makeFuelMeasureEvent(
  ctx: EventContext,
  data: { percent?: number; refillToFull?: boolean; addedLiters?: number },
): FuelMeasureEvent {
  return {
    ...base(ctx),
    type: 'fuel_measure',
    ...(data.percent !== undefined ? { percent: data.percent } : {}),
    ...(data.refillToFull !== undefined ? { refillToFull: data.refillToFull } : {}),
    ...(data.addedLiters !== undefined ? { addedLiters: data.addedLiters } : {}),
  };
}

export function makeWaterMeasureEvent(
  ctx: EventContext,
  counter: number,
  activeTank: WaterTank,
): WaterMeasureEvent {
  return { ...base(ctx), type: 'water_measure', counter, activeTank };
}

export function makeWaterRefillEvent(
  ctx: EventContext,
  tank: WaterTank,
  data: { toFull?: boolean; addedLiters?: number },
): WaterRefillEvent {
  return {
    ...base(ctx),
    type: 'water_refill',
    tank,
    ...(data.toFull !== undefined ? { toFull: data.toFull } : {}),
    ...(data.addedLiters !== undefined ? { addedLiters: data.addedLiters } : {}),
  };
}

export function makeGasMeasureEvent(
  ctx: EventContext,
  weightKg: number,
): GasMeasureEvent {
  return { ...base(ctx), type: 'gas_measure', weightKg };
}

export function makeGasSwapEvent(ctx: EventContext): GasSwapEvent {
  return { ...base(ctx), type: 'gas_swap' };
}

// ── avaries ──────────────────────────────────────────────────────────────────
export function makeFaultReportEvent(
  ctx: EventContext,
  data: { title: string; description: string; severity: FaultSeverity },
): FaultReportEvent {
  const b = base(ctx);
  // Per conveni el faultId és l'id del propi event report.
  return {
    ...b,
    type: 'fault_report',
    faultId: b.id,
    title: data.title,
    description: data.description,
    severity: data.severity,
  };
}

export function makeFaultUpdateEvent(
  ctx: EventContext,
  faultId: ID,
  payload: { text?: string; photoPath?: string },
): FaultUpdateEvent {
  return { ...base(ctx), type: 'fault_update', faultId, ...payload };
}

export function makeFaultEditEvent(
  ctx: EventContext,
  faultId: ID,
  data: { title: string; description: string; severity: FaultSeverity },
): FaultEditEvent {
  return { ...base(ctx), type: 'fault_edit', faultId, ...data };
}

export function makeFaultTagsEvent(
  ctx: EventContext,
  faultId: ID,
  tags: string[],
): FaultTagsEvent {
  return { ...base(ctx), type: 'fault_tags', faultId, tags };
}

export function makeFaultResolveEvent(
  ctx: EventContext,
  faultId: ID,
): FaultResolveEvent {
  return { ...base(ctx), type: 'fault_resolve', faultId };
}

export function makeFaultReopenEvent(
  ctx: EventContext,
  faultId: ID,
): FaultReopenEvent {
  return { ...base(ctx), type: 'fault_reopen', faultId };
}

export function makeFaultBarrierEvent(
  ctx: EventContext,
  cut: OrderKey,
): FaultBarrierEvent {
  return { ...base(ctx), type: 'fault_barrier', cut };
}

// ── llista de la compra ────────────────────────────────────────────────────────
export function makeShoppingAddEvent(
  ctx: EventContext,
  objectId: ID,
  delta: number,
): ShoppingAddEvent {
  return { ...base(ctx), type: 'shopping_add', objectId, delta };
}

export function makeShoppingRemoveEvent(
  ctx: EventContext,
  objectId: ID,
): ShoppingRemoveEvent {
  return { ...base(ctx), type: 'shopping_remove', objectId };
}

export function makeShoppingBoughtEvent(
  ctx: EventContext,
  objectId: ID,
  qty: number,
): ShoppingBoughtEvent {
  return { ...base(ctx), type: 'shopping_bought', objectId, qty };
}

export function makeShoppingBarrierEvent(
  ctx: EventContext,
  cut: OrderKey,
): ShoppingBarrierEvent {
  return { ...base(ctx), type: 'shopping_barrier', cut };
}

// ── documentació tècnica ───────────────────────────────────────────────────────
export function makeDocumentCreateEvent(
  ctx: EventContext,
  data: {
    title: string;
    description: string;
    category: DocCategory;
    data: DocVersionData;
  },
): DocumentCreateEvent {
  const b = base(ctx);
  // Per conveni el docId és l'id del propi event de creació.
  return {
    ...b,
    type: 'document_create',
    docId: b.id,
    title: data.title,
    description: data.description,
    category: data.category,
    data: data.data,
  };
}

export function makeDocumentEditEvent(
  ctx: EventContext,
  docId: ID,
  data: {
    title: string;
    description: string;
    category: DocCategory;
    data: DocVersionData;
  },
): DocumentEditEvent {
  return {
    ...base(ctx),
    type: 'document_edit',
    docId,
    title: data.title,
    description: data.description,
    category: data.category,
    data: data.data,
  };
}

export function makeDocumentRenewEvent(
  ctx: EventContext,
  docId: ID,
  data: DocVersionData,
): DocumentRenewEvent {
  return { ...base(ctx), type: 'document_renew', docId, data };
}

export function makeDocumentCommentEvent(
  ctx: EventContext,
  docId: ID,
  versionSeq: number,
  payload: { text?: string; photoPath?: string },
): DocumentCommentEvent {
  return { ...base(ctx), type: 'document_comment', docId, versionSeq, ...payload };
}

export function makeDocumentCommentDeleteEvent(
  ctx: EventContext,
  docId: ID,
  commentId: ID,
): DocumentCommentDeleteEvent {
  return { ...base(ctx), type: 'document_comment_delete', docId, commentId };
}

export function makeDocumentDeleteEvent(
  ctx: EventContext,
  docId: ID,
): DocumentDeleteEvent {
  return { ...base(ctx), type: 'document_delete', docId };
}

export function makeDocumentRestoreEvent(
  ctx: EventContext,
  docId: ID,
): DocumentRestoreEvent {
  return { ...base(ctx), type: 'document_restore', docId };
}

export function makeDocumentBarrierEvent(
  ctx: EventContext,
  cut: OrderKey,
): DocumentBarrierEvent {
  return { ...base(ctx), type: 'document_barrier', cut };
}

// ── guia del vaixell ───────────────────────────────────────────────────────────
export function makeGuideUpsertEvent(
  ctx: EventContext,
  payload: GuideSection,
): GuideUpsertEvent {
  return { ...base(ctx), type: 'guide_upsert', payload };
}

export function makeGuideDeleteEvent(
  ctx: EventContext,
  sectionId: ID,
): GuideDeleteEvent {
  return { ...base(ctx), type: 'guide_delete', sectionId };
}
