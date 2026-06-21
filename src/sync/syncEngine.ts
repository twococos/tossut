import { supabase, isSupabaseConfigured } from './supabase';
import { rowToEvent, eventToBatchItem, type EventRow } from './mappers';
import { flushPendingPhotos } from './photoQueue';
import {
  getPendingEvents,
  getAllEvents,
  markSynced,
  upsertRemoteEvents,
  stripLocalMeta,
  purgeNonUuidUpserts,
  purgeBeforeBarrier,
} from '@/db/repositories/events.repo';
import { getMeta, putMeta } from '@/db/repositories/meta.repo';
import { recomputeAll } from '@/db/recompute';
import { activeResetBarrier } from '@/domain/inventory/barrier';
import { activeFaultBarrier } from '@/domain/faults/deriveFaults';
import { activeShoppingBarrier } from '@/domain/shopping/deriveShoppingList';
import { activeDocumentBarrier } from '@/domain/documents/deriveDocuments';
import {
  purgeFaultsBeforeBarrier,
  purgeShoppingBeforeBarrier,
  purgeDocumentsBeforeBarrier,
} from '@/db/repositories/events.repo';
import { nowISO } from '@/lib/time';
import type { AppEvent, OrderKey } from '@/types/events';

/**
 * Demana al servidor que esborri els stock_delta anteriors al tall i les barreres velles,
 * conservant la barrera de reset nova. Best-effort: si Supabase no està configurat o falla
 * (offline), no passa res — la correcció la garanteix la barrera persistent, no aquest DELETE.
 */
export async function requestServerReset(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.rpc('reset_stock_events', {
      cut_occurred_at: cut.occurredAt,
      cut_device_id: cut.deviceId,
      cut_seq: cut.seq,
      keep_barrier_id: keepBarrierId,
    });
  } catch (error) {
    console.error('[sync] reset_stock_events error:', error);
  }
}

/**
 * Mirall de `requestServerReset` per a l'historial d'avaries: esborra al servidor els events
 * fault_* anteriors al tall i les fault_barrier velles, conservant la barrera nova. Best-effort.
 */
export async function requestServerFaultReset(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.rpc('reset_fault_events', {
      cut_occurred_at: cut.occurredAt,
      cut_device_id: cut.deviceId,
      cut_seq: cut.seq,
      keep_barrier_id: keepBarrierId,
    });
  } catch (error) {
    console.error('[sync] reset_fault_events error:', error);
  }
}

/**
 * Mirall de `requestServerFaultReset` per a l'historial de documents: esborra al servidor els
 * events document_* anteriors al tall i les document_barrier velles, conservant la barrera nova.
 * Best-effort.
 */
export async function requestServerDocumentReset(
  cut: OrderKey,
  keepBarrierId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.rpc('reset_document_events', {
      cut_occurred_at: cut.occurredAt,
      cut_device_id: cut.deviceId,
      cut_seq: cut.seq,
      keep_barrier_id: keepBarrierId,
    });
  } catch (error) {
    console.error('[sync] reset_document_events error:', error);
  }
}

export interface SyncResult {
  ok: boolean;
  reason?: 'offline' | 'not-configured' | 'error';
  pushed?: number;
  pulled?: number;
  photos?: number;
  lastSyncedAt?: string;
  error?: unknown;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Sincronitza el dispositiu amb el núvol.
 *
 * Passos (PLA.md secció 6):
 *   1. PUSH: empeny els esdeveniments locals pendents (idempotent per id via RPC).
 *   2. PULL: baixa els esdeveniments nous (server_seq > marca d'aigua), dedup per id.
 *   3. FOTOS: puja les fotos pendents fetes offline.
 *   4. RECOMPUTE: recalcula inventari + definicions a partir del log complet.
 *   5. Desa lastSyncedAt.
 *
 * Conflictes: pràcticament inexistents. Els esdeveniments són immutables i additius, i
 * el fold determinista + saturant per pas dóna un únic resultat per a qualsevol
 * intercalat. No hi ha UI de resolució de conflictes.
 *
 * És reentrant-safe: si ja hi ha una sincronització en curs, retorna la mateixa
 * promesa en lloc d'iniciar-ne una de nova.
 */
export function sync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: 'not-configured' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, reason: 'offline' };
  }

  try {
    const meta = await getMeta();

    // ── 0. NETEJA ────────────────────────────────────────────────────────────
    // Treu esdeveniments *_upsert amb id de payload no-UUID que el trigger de
    // Supabase rebutjaria, bloquejant el push. Idempotent (no fa res si no n'hi ha).
    const purged = await purgeNonUuidUpserts();
    if (purged > 0) await recomputeAll();

    // ── 0b. RESET conegut: no repugem stock_delta anteriors a un reset ─────────
    // Si ja coneixem una barrera de reset (local o sincronitzada), netegem els events
    // locals anteriors ABANS del push perquè un dispositiu que torna online no reinjecti
    // estoc vell al servidor. La barrera persistent ho cobriria igual, però així evitem
    // el viatge d'anada i tornada.
    let purgedByReset = false;
    {
      const allLocal = await getAllEvents();
      const reset = activeResetBarrier(allLocal);
      if (reset) {
        const removed = await purgeBeforeBarrier(reset.cut, reset.id);
        if (removed > 0) purgedByReset = true;
      }
      // Mateixa lògica per a l'historial d'avaries.
      const faultReset = activeFaultBarrier(allLocal);
      if (faultReset) {
        const removed = await purgeFaultsBeforeBarrier(faultReset.cut, faultReset.id);
        if (removed > 0) purgedByReset = true;
      }
      // Mateixa lògica per al buidat de la llista de la compra.
      const shoppingBarrier = activeShoppingBarrier(allLocal);
      if (shoppingBarrier) {
        const removed = await purgeShoppingBeforeBarrier(
          shoppingBarrier.cut,
          shoppingBarrier.id,
        );
        if (removed > 0) purgedByReset = true;
      }
      // Mateixa lògica per a l'historial de documents.
      const documentBarrier = activeDocumentBarrier(allLocal);
      if (documentBarrier) {
        const removed = await purgeDocumentsBeforeBarrier(
          documentBarrier.cut,
          documentBarrier.id,
        );
        if (removed > 0) purgedByReset = true;
      }
    }

    // ── 1. PUSH ──────────────────────────────────────────────────────────────
    const pending = await getPendingEvents();
    let pushed = 0;
    if (pending.length > 0) {
      const batch = pending.map((row) => eventToBatchItem(stripLocalMeta(row)));
      const { error } = await supabase.rpc('push_events', { batch });
      if (error) throw error;
      await markSynced(pending.map((p) => p.id));
      pushed = pending.length;
    }

    // ── 2. PULL ──────────────────────────────────────────────────────────────
    const { data, error: pullError } = await supabase
      .from('events')
      .select('*')
      .gt('server_seq', meta.lastServerSeq)
      .order('server_seq', { ascending: true });
    if (pullError) throw pullError;

    const rows = (data ?? []) as EventRow[];
    let pulled = 0;
    let purgedByPulledReset = false;
    if (rows.length > 0) {
      const pulledEvents: AppEvent[] = rows.map(rowToEvent);
      await upsertRemoteEvents(rows.map(rowToEvent));
      meta.lastServerSeq = rows[rows.length - 1]!.server_seq;
      pulled = rows.length;

      // Cascada: si hem baixat una barrera de reset, netegem localment els events
      // anteriors (cada dispositiu fa la seva neteja sense coordinació).
      const reset = activeResetBarrier(pulledEvents);
      if (reset) {
        const removed = await purgeBeforeBarrier(reset.cut, reset.id);
        if (removed > 0) purgedByPulledReset = true;
      }
      const faultReset = activeFaultBarrier(pulledEvents);
      if (faultReset) {
        const removed = await purgeFaultsBeforeBarrier(faultReset.cut, faultReset.id);
        if (removed > 0) purgedByPulledReset = true;
      }
      const shoppingBarrier = activeShoppingBarrier(pulledEvents);
      if (shoppingBarrier) {
        const removed = await purgeShoppingBeforeBarrier(
          shoppingBarrier.cut,
          shoppingBarrier.id,
        );
        if (removed > 0) purgedByPulledReset = true;
      }
      const documentBarrier = activeDocumentBarrier(pulledEvents);
      if (documentBarrier) {
        const removed = await purgeDocumentsBeforeBarrier(
          documentBarrier.cut,
          documentBarrier.id,
        );
        if (removed > 0) purgedByPulledReset = true;
      }
    }

    // ── 3. FOTOS ─────────────────────────────────────────────────────────────
    const photos = await flushPendingPhotos();

    // ── 4. RECOMPUTE ─────────────────────────────────────────────────────────
    if (pulled > 0 || pushed > 0 || purgedByReset || purgedByPulledReset) {
      await recomputeAll();
    }

    // ── 5. Desar estat ───────────────────────────────────────────────────────
    meta.lastSyncedAt = nowISO();
    // Sync correcte: neteja qualsevol error previ perquè el diagnòstic no mostri rastres vells.
    delete meta.lastSyncError;
    delete meta.lastSyncErrorAt;
    await putMeta(meta);

    return {
      ok: true,
      pushed,
      pulled,
      photos,
      lastSyncedAt: meta.lastSyncedAt,
    };
  } catch (error) {
    // Log temporal per diagnosticar errors de sync (mira la consola del navegador).
    console.error('[sync] error:', error);
    // Persisteix l'error perquè es pugui llegir des de la pantalla de diagnòstic dins
    // l'app (al mòbil no hi ha consola). Best-effort: si això també falla, no l'amaguem.
    try {
      const meta = await getMeta();
      meta.lastSyncError = stringifySyncError(error);
      meta.lastSyncErrorAt = nowISO();
      await putMeta(meta);
    } catch (persistError) {
      console.error('[sync] no s\'ha pogut desar l\'error de sync:', persistError);
    }
    return { ok: false, reason: 'error', error };
  }
}

/**
 * Converteix un error de sync (sovint un PostgrestError de Supabase o un Error normal)
 * en un text llegible amb tots els camps útils per diagnosticar (message, code, details,
 * hint). Es desa a meta.lastSyncError per mostrar-lo a la pantalla de diagnòstic.
 */
function stringifySyncError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    if (e.message) parts.push(String(e.message));
    if (e.code) parts.push(`code=${String(e.code)}`);
    if (e.details) parts.push(`details=${String(e.details)}`);
    if (e.hint) parts.push(`hint=${String(e.hint)}`);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}
