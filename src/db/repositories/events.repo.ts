import { db, type LocalEvent } from '../db';
import type { AppEvent, OrderKey } from '@/types/events';
import { compareKey, keyOf } from '@/domain/inventory/ordering';

/** Afegeix un esdeveniment local nou (pendent de sincronitzar). */
export async function addLocalEvent(event: AppEvent): Promise<void> {
  const row: LocalEvent = { ...event, _pending: 1 };
  await db.events.put(row);
}

/** Tots els esdeveniments (com a AppEvent, sense les metadades locals). */
export async function getAllEvents(): Promise<AppEvent[]> {
  const rows = await db.events.toArray();
  return rows.map(stripLocalMeta);
}

/** Esdeveniments encara no sincronitzats (cua de push). */
export async function getPendingEvents(): Promise<LocalEvent[]> {
  return db.events.where('_pending').equals(1).toArray();
}

/** Marca un conjunt d'esdeveniments com a sincronitzats. */
export async function markSynced(ids: string[]): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    for (const id of ids) {
      const row = await db.events.get(id);
      if (row) await db.events.put({ ...row, _pending: 0 });
    }
  });
}

/**
 * Insereix esdeveniments baixats del servidor, deduplicant per `id`.
 *
 * `put` actua com a upsert: si l'esdeveniment ja existeix localment (p.ex. un que vam
 * crear nosaltres i ara torna del servidor), s'actualitza sense duplicar-se.
 */
export async function upsertRemoteEvents(
  events: Array<AppEvent & { _serverSeq?: number }>,
): Promise<void> {
  const rows: LocalEvent[] = events.map((e) => ({
    ...e,
    _pending: 0,
    _serverSeq: e._serverSeq,
  }));
  await db.events.bulkPut(rows);
}

/** Treu les metadades locals (`_pending`, `_serverSeq`) deixant un AppEvent net. */
export function stripLocalMeta(row: LocalEvent): AppEvent {
  const { _pending, _serverSeq, ...event } = row;
  void _pending;
  void _serverSeq;
  return event as AppEvent;
}

/**
 * Neteja física després d'un reset: esborra localment els `stock_delta` anteriors al tall
 * (clau < cut) i totes les `stock_barrier` EXCEPTE la d'id `keepBarrierId` (la barrera de
 * reset nova, que es conserva com a salvaguarda determinista).
 *
 * No és la font de correcció (la garanteix la barrera a la derivació); només allibera espai
 * i evita que els events vells es repugin. Reutilitzada pel command de reset i per la neteja
 * en cascada del sync en veure un reset nou. Retorna quants esdeveniments ha tret.
 */
export async function purgeBeforeBarrier(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<number> {
  const rows = await db.events.toArray();
  const toDelete = rows.filter((r) => {
    if (r.type === 'stock_barrier') return r.id !== keepBarrierId;
    if (r.type === 'stock_delta') return compareKey(keyOf(r), cut) < 0;
    return false;
  });
  if (toDelete.length > 0) {
    await db.events.bulkDelete(toDelete.map((r) => r.id));
  }
  return toDelete.length;
}

/**
 * Neteja física després d'un reset d'avaries: esborra localment els events fault_*
 * (`fault_report`/`fault_update`/`fault_resolve`) anteriors al tall (clau < cut) i totes les
 * `fault_barrier` EXCEPTE la d'id `keepBarrierId` (la barrera de reset nova, salvaguarda
 * determinista). Mirall de `purgeBeforeBarrier` per a l'estoc. Retorna quants n'ha tret.
 */
export async function purgeFaultsBeforeBarrier(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<number> {
  const rows = await db.events.toArray();
  const toDelete = rows.filter((r) => {
    if (r.type === 'fault_barrier') return r.id !== keepBarrierId;
    if (
      r.type === 'fault_report' ||
      r.type === 'fault_update' ||
      r.type === 'fault_resolve' ||
      r.type === 'fault_reopen'
    ) {
      return compareKey(keyOf(r), cut) < 0;
    }
    return false;
  });
  if (toDelete.length > 0) {
    await db.events.bulkDelete(toDelete.map((r) => r.id));
  }
  return toDelete.length;
}

/**
 * Neteja física després de buidar la llista de la compra: esborra localment els events
 * shopping_* (`shopping_add`/`shopping_remove`/`shopping_bought`) anteriors al tall (clau <
 * cut) i totes les `shopping_barrier` EXCEPTE la d'id `keepBarrierId`. Mirall de
 * `purgeFaultsBeforeBarrier`. NO toca els `stock_delta` (l'estoc de "Comprat!" és real).
 * Retorna quants n'ha tret.
 */
export async function purgeShoppingBeforeBarrier(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<number> {
  const rows = await db.events.toArray();
  const toDelete = rows.filter((r) => {
    if (r.type === 'shopping_barrier') return r.id !== keepBarrierId;
    if (
      r.type === 'shopping_add' ||
      r.type === 'shopping_remove' ||
      r.type === 'shopping_bought'
    ) {
      return compareKey(keyOf(r), cut) < 0;
    }
    return false;
  });
  if (toDelete.length > 0) {
    await db.events.bulkDelete(toDelete.map((r) => r.id));
  }
  return toDelete.length;
}

/**
 * Neteja física després d'un reset de documents: esborra localment els events document_*
 * (`document_create`/`document_edit`/`document_renew`/`document_comment`/
 * `document_comment_delete`/`document_delete`) anteriors al tall (clau < cut) i totes les
 * `document_barrier` EXCEPTE la d'id `keepBarrierId`. Mirall de `purgeFaultsBeforeBarrier`.
 * Retorna quants n'ha tret.
 */
export async function purgeDocumentsBeforeBarrier(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<number> {
  const rows = await db.events.toArray();
  const toDelete = rows.filter((r) => {
    if (r.type === 'document_barrier') return r.id !== keepBarrierId;
    if (
      r.type === 'document_create' ||
      r.type === 'document_edit' ||
      r.type === 'document_renew' ||
      r.type === 'document_comment' ||
      r.type === 'document_comment_delete' ||
      r.type === 'document_delete' ||
      r.type === 'document_restore'
    ) {
      return compareKey(keyOf(r), cut) < 0;
    }
    return false;
  });
  if (toDelete.length > 0) {
    await db.events.bulkDelete(toDelete.map((r) => r.id));
  }
  return toDelete.length;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Purga esdeveniments `*_upsert` el payload dels quals té un id que no és un UUID
 * vàlid. El trigger de mirall de Supabase casta `payload.id` a uuid, així que un id
 * no-UUID fa fallar el push i bloqueja TOT el sync indefinidament (l'esdeveniment
 * dolent es reintenta a cada cicle). Una versió primerenca de la foto de capçalera
 * de Llocs feia servir un id no-UUID; aquesta neteja única treu aquells esdeveniments
 * encallats. És idempotent i inofensiva si no n'hi ha cap. Retorna quants n'ha tret.
 */
export async function purgeNonUuidUpserts(): Promise<number> {
  const rows = await db.events.toArray();
  const bad = rows.filter((r) => {
    if (!r.type.endsWith('_upsert')) return false;
    const id = (r as { payload?: { id?: unknown } }).payload?.id;
    return typeof id === 'string' && !UUID_RE.test(id);
  });
  if (bad.length > 0) {
    await db.events.bulkDelete(bad.map((r) => r.id));
  }
  return bad.length;
}
