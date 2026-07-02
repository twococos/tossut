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
  AppEvent,
  StockDeltaLine,
  StockDeltaReason,
  OrderKey,
  FaultSeverity,
} from '@/types/events';
import {
  makeStockDeltaEvent,
  makeStockBarrierEvent,
  makeObjectUpsertEvent,
  makeLocationUpsertEvent,
  makeRecipeUpsertEvent,
  makeChecklistUpsertEvent,
  makeObjectDeleteEvent,
  makeLocationDeleteEvent,
  makeRecipeDeleteEvent,
  makeChecklistDeleteEvent,
  makeResourceConfigUpsertEvent,
  makeFuelMeasureEvent,
  makeWaterMeasureEvent,
  makeWaterRefillEvent,
  makeGasMeasureEvent,
  makeGasSwapEvent,
  makeFaultReportEvent,
  makeFaultUpdateEvent,
  makeFaultResolveEvent,
  makeFaultReopenEvent,
  makeFaultBarrierEvent,
  makeShoppingAddEvent,
  makeShoppingRemoveEvent,
  makeShoppingBoughtEvent,
  makeShoppingBarrierEvent,
  makeDocumentCreateEvent,
  makeDocumentEditEvent,
  makeDocumentRenewEvent,
  makeDocumentCommentEvent,
  makeDocumentCommentDeleteEvent,
  makeDocumentDeleteEvent,
  makeDocumentRestoreEvent,
  makeDocumentBarrierEvent,
  makeGuideUpsertEvent,
  makeGuideDeleteEvent,
  type EventContext,
} from '@/domain/events/factories';
import {
  addLocalEvent,
  purgeBeforeBarrier,
  purgeFaultsBeforeBarrier,
  purgeShoppingBeforeBarrier,
  purgeDocumentsBeforeBarrier,
} from './repositories/events.repo';
import { getMeta, nextLocalSeq } from './repositories/meta.repo';
import { recomputeAll } from './recompute';
import {
  requestServerReset,
  requestServerFaultReset,
  requestServerDocumentReset,
} from '@/sync/syncEngine';
import { nowISO } from '@/lib/time';

/**
 * Capa de comandes: porta ÚNICA d'escriptura per a la UI.
 *
 * Cada comanda: reserva un `seq` monòton → construeix l'esdeveniment amb la factory del
 * domini → el desa a Dexie (pendent) → recalcula les caus derivades. La UI sempre
 * escriu aquí (mai a Supabase directament); la sincronització és en segon pla.
 *
 * El context d'autoria (`deviceId`, `userName`) s'obté de meta + sessió. El `userName`
 * s'injecta des de la capa d'auth en cada crida.
 */
async function buildContext(userName: string): Promise<EventContext> {
  const meta = await getMeta();
  const seq = await nextLocalSeq();
  return { deviceId: meta.deviceId, userName, seq };
}

/** Desa un esdeveniment ja construït i recalcula. */
async function commit(event: AppEvent): Promise<void> {
  await addLocalEvent(event);
  await recomputeAll();
}

// ── deltes d'estoc ───────────────────────────────────────────────────────────
export async function commitStockDelta(
  userName: string,
  reason: StockDeltaReason,
  lines: StockDeltaLine[],
  extra?: { recipeId?: ID; diners?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeStockDeltaEvent(ctx, reason, lines, extra));
}

// ── barreres de tall (rebobinar / esborrar historial d'estoc) ────────────────
/**
 * Rebobina l'estoc fins a un event de l'historial: emet una barrera `rewind` que fa que la
 * derivació ignori els stock_delta posteriors a `target` (l'event diana es conserva). No
 * esborra res; és reversible emetent un rewind a un punt més recent.
 */
export async function commitStockRewind(
  userName: string,
  target: OrderKey,
  targetEventId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeStockBarrierEvent(ctx, 'rewind', target, targetEventId));
}

/**
 * Reinicia tot l'estoc a 0: emet una barrera `reset` (que ignora tot el passat) i després
 * fa neteja física best-effort (local + servidor) esborrant els stock_delta i barreres
 * vells, conservant la barrera de reset nova com a salvaguarda. NOMÉS afecta l'estoc;
 * objectes/llocs/receptes/checklists es conserven.
 */
export async function commitStockReset(userName: string): Promise<void> {
  const base = await buildContext(userName);
  const ctx = { ...base, occurredAt: nowISO() };
  const cut: OrderKey = { occurredAt: ctx.occurredAt, deviceId: ctx.deviceId, seq: ctx.seq };
  const event = makeStockBarrierEvent(ctx, 'reset', cut, null);
  await commit(event);
  // Neteja física oportunista (no afecta la correcció; la garanteix la barrera).
  await purgeBeforeBarrier(cut, event.id);
  await requestServerReset(cut, event.id);
  await recomputeAll();
}

// ── upserts de definició ─────────────────────────────────────────────────────
export async function commitObjectUpsert(
  userName: string,
  payload: ItemObject,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeObjectUpsertEvent(ctx, payload));
}

export async function commitLocationUpsert(
  userName: string,
  payload: StowageLocation,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeLocationUpsertEvent(ctx, payload));
}

export async function commitRecipeUpsert(
  userName: string,
  payload: Recipe,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeRecipeUpsertEvent(ctx, payload));
}

export async function commitChecklistUpsert(
  userName: string,
  payload: ChecklistTemplate,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeChecklistUpsertEvent(ctx, payload));
}

// ── guia del vaixell ─────────────────────────────────────────────────────────
/** Crear o editar una secció de la guia (snapshot complet; last-writer-wins). */
export async function commitGuideUpsert(
  userName: string,
  payload: GuideSection,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGuideUpsertEvent(ctx, payload));
}

/** Eliminar una secció de la guia (tombstone). */
export async function commitGuideDelete(
  userName: string,
  sectionId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGuideDeleteEvent(ctx, sectionId));
}

// ── deletes de definició ─────────────────────────────────────────────────────
// L'eliminació en cascada (treure l'objecte de les receptes, el lloc dels objectes)
// la resol la derivació a deriveDefinitions; aquí només s'emet el tombstone.
export async function commitObjectDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeObjectDeleteEvent(ctx, id));
}

export async function commitLocationDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeLocationDeleteEvent(ctx, id));
}

export async function commitRecipeDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeRecipeDeleteEvent(ctx, id));
}

export async function commitChecklistDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeChecklistDeleteEvent(ctx, id));
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
export async function commitResourceConfig(
  userName: string,
  payload: ResourceConfig,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeResourceConfigUpsertEvent(ctx, payload));
}

export async function commitFuelMeasure(
  userName: string,
  data: { percent?: number; refillToFull?: boolean; addedLiters?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeFuelMeasureEvent(ctx, data));
}

export async function commitWaterMeasure(
  userName: string,
  counter: number,
  activeTank: WaterTank,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeWaterMeasureEvent(ctx, counter, activeTank));
}

export async function commitWaterRefill(
  userName: string,
  tank: WaterTank,
  data: { toFull?: boolean; addedLiters?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeWaterRefillEvent(ctx, tank, data));
}

export async function commitGasMeasure(
  userName: string,
  weightKg: number,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGasMeasureEvent(ctx, weightKg));
}

export async function commitGasSwap(userName: string): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGasSwapEvent(ctx));
}

// ── avaries ────────────────────────────────────────────────────────────────────
/** Reporta (crea) una avaria. Retorna el faultId creat. */
export async function commitFaultReport(
  userName: string,
  data: { title: string; description: string; severity: FaultSeverity },
): Promise<ID> {
  const ctx = await buildContext(userName);
  const event = makeFaultReportEvent(ctx, data);
  await commit(event);
  return event.faultId;
}

/**
 * Afegeix una actualització follow-up a una avaria. És O de text O de foto (mai les dues):
 * el payload ha de portar exactament un de `text`/`photoPath`; si no, no fa res.
 */
export async function commitFaultUpdate(
  userName: string,
  faultId: ID,
  payload: { text?: string; photoPath?: string },
): Promise<void> {
  const text = payload.text?.trim() || undefined;
  const photoPath = payload.photoPath || undefined;
  // Exactament un dels dos.
  if (!text === !photoPath) return;
  const ctx = await buildContext(userName);
  await commit(makeFaultUpdateEvent(ctx, faultId, { text, photoPath }));
}

/** Soluciona una avaria (surt de la llista d'actives). */
export async function commitFaultResolve(
  userName: string,
  faultId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeFaultResolveEvent(ctx, faultId));
}

/** Reobre una avaria solucionada (torna a la llista d'actives). */
export async function commitFaultReopen(
  userName: string,
  faultId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeFaultReopenEvent(ctx, faultId));
}

/**
 * Esborra l'historial d'avaries: emet una barrera (ignora tot el passat) i fa neteja física
 * best-effort (local + servidor), conservant la barrera nova com a salvaguarda. Mirall de
 * `commitStockReset`.
 */
export async function commitFaultReset(userName: string): Promise<void> {
  const base = await buildContext(userName);
  const ctx = { ...base, occurredAt: nowISO() };
  const cut: OrderKey = { occurredAt: ctx.occurredAt, deviceId: ctx.deviceId, seq: ctx.seq };
  const event = makeFaultBarrierEvent(ctx, cut);
  await commit(event);
  await purgeFaultsBeforeBarrier(cut, event.id);
  await requestServerFaultReset(cut, event.id);
  await recomputeAll();
}

// ── llista de la compra ──────────────────────────────────────────────────────
/** Afegeix (delta>0) o edita (delta amb signe) la quantitat d'un objecte a la llista. */
export async function commitShoppingAdd(
  userName: string,
  objectId: ID,
  delta: number,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeShoppingAddEvent(ctx, objectId, delta));
}

/** Treu del tot un objecte de la llista (sense afectar l'estoc). */
export async function commitShoppingRemove(
  userName: string,
  objectId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeShoppingRemoveEvent(ctx, objectId));
}

/**
 * "Comprat!": treu l'objecte de la llista I l'afegeix a l'estoc. Emet DOS events amb el
 * mateix `occurredAt` i dos `seq` consecutius (stock_delta purchase + shopping_bought) i un
 * sol recompute, per atomicitat lògica. `expiresAt` opcional (objectes amb caducitat a l'afegir).
 */
export async function commitShoppingBought(
  userName: string,
  objectId: ID,
  qty: number,
  expiresAt?: string,
): Promise<void> {
  const meta = await getMeta();
  const occurredAt = nowISO();
  const seq1 = await nextLocalSeq();
  const seq2 = await nextLocalSeq();
  const ctx1: EventContext = { deviceId: meta.deviceId, userName, seq: seq1, occurredAt };
  const ctx2: EventContext = { deviceId: meta.deviceId, userName, seq: seq2, occurredAt };
  const stockEvent = makeStockDeltaEvent(ctx1, 'purchase', [
    {
      objectId,
      delta: qty,
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    },
  ]);
  const boughtEvent = makeShoppingBoughtEvent(ctx2, objectId, qty);
  await addLocalEvent(stockEvent);
  await addLocalEvent(boughtEvent);
  await recomputeAll();
}

/**
 * Buidar la llista de la compra: emet una barrera (ignora tot el passat) + neteja física local
 * best-effort, conservant la barrera nova com a salvaguarda. Mirall de `commitFaultReset` però
 * SENSE crida RPC de servidor (els shopping_* vells queden al servidor; la barrera els ignora).
 */
export async function commitShoppingClear(userName: string): Promise<void> {
  const base = await buildContext(userName);
  const ctx = { ...base, occurredAt: nowISO() };
  const cut: OrderKey = { occurredAt: ctx.occurredAt, deviceId: ctx.deviceId, seq: ctx.seq };
  const event = makeShoppingBarrierEvent(ctx, cut);
  await commit(event);
  await purgeShoppingBeforeBarrier(cut, event.id);
  await recomputeAll();
}

// ── documentació tècnica ───────────────────────────────────────────────────────
/** Crea un document (1a versió). Retorna el docId creat. */
export async function commitDocumentCreate(
  userName: string,
  data: {
    title: string;
    description: string;
    category: DocCategory;
    data: DocVersionData;
  },
): Promise<ID> {
  const ctx = await buildContext(userName);
  const event = makeDocumentCreateEvent(ctx, data);
  await commit(event);
  return event.docId;
}

/** Edita les metadades de la versió vigent (no crea una versió nova). */
export async function commitDocumentEdit(
  userName: string,
  docId: ID,
  data: {
    title: string;
    description: string;
    category: DocCategory;
    data: DocVersionData;
  },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeDocumentEditEvent(ctx, docId, data));
}

/** Renova un document: nova versió vigent (la prèvia queda a l'historial). */
export async function commitDocumentRenew(
  userName: string,
  docId: ID,
  data: DocVersionData,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeDocumentRenewEvent(ctx, docId, data));
}

/**
 * Afegeix un comentari a un document, lligat a la versió vigent (`versionSeq`). És O de text
 * O de foto (mai les dues); si no en porta exactament un, no fa res.
 */
export async function commitDocumentComment(
  userName: string,
  docId: ID,
  versionSeq: number,
  payload: { text?: string; photoPath?: string },
): Promise<void> {
  const text = payload.text?.trim() || undefined;
  const photoPath = payload.photoPath || undefined;
  // Exactament un dels dos.
  if (!text === !photoPath) return;
  const ctx = await buildContext(userName);
  await commit(makeDocumentCommentEvent(ctx, docId, versionSeq, { text, photoPath }));
}

/** Oculta un comentari (deixa de mostrar-se a la targeta; queda a l'historial). */
export async function commitDocumentCommentDelete(
  userName: string,
  docId: ID,
  commentId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeDocumentCommentDeleteEvent(ctx, docId, commentId));
}

/** Elimina un document (surt de la llista; tot queda a l'historial). */
export async function commitDocumentDelete(
  userName: string,
  docId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeDocumentDeleteEvent(ctx, docId));
}

/** Reinstaura un document eliminat (torna a la llista d'actius). */
export async function commitDocumentRestore(
  userName: string,
  docId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeDocumentRestoreEvent(ctx, docId));
}

/**
 * Esborra l'historial de documents: emet una barrera (ignora tot el passat) i fa neteja física
 * best-effort (local + servidor), conservant la barrera nova com a salvaguarda. Mirall de
 * `commitFaultReset`.
 */
export async function commitDocumentReset(userName: string): Promise<void> {
  const base = await buildContext(userName);
  const ctx = { ...base, occurredAt: nowISO() };
  const cut: OrderKey = { occurredAt: ctx.occurredAt, deviceId: ctx.deviceId, seq: ctx.seq };
  const event = makeDocumentBarrierEvent(ctx, cut);
  await commit(event);
  await purgeDocumentsBeforeBarrier(cut, event.id);
  await requestServerDocumentReset(cut, event.id);
  await recomputeAll();
}
