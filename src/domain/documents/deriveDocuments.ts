import type {
  ID,
  ISOTimestamp,
  UserName,
  DocCategory,
  DocVersionData,
} from '@/types/entities';
import type { AppEvent, DocumentBarrierEvent } from '@/types/events';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';
import { diffDays } from '@/lib/time';

/**
 * Derivació de l'estat de la documentació tècnica a partir del log d'esdeveniments.
 *
 * Un document no es guarda; es deriva reproduint els seus events (`document_create`,
 * `document_edit`, `document_renew`, `document_comment`, `document_comment_delete`,
 * `document_delete`) en ordre determinista `(occurredAt, deviceId, seq)`. Paral·lel a
 * `deriveFaults`. Tots els dispositius deriven el mateix → sense conflictes de sync.
 *
 * - La RENOVACIÓ crea una versió nova (la prèvia queda a l'historial). La targeta mostra
 *   sempre la versió vigent.
 * - Els COMENTARIS estan lligats a una versió (`versionSeq`). A la targeta només surten
 *   els de la versió vigent i no eliminats; la resta queden a l'historial.
 *
 * Una `document_barrier` (reset de l'historial) fa que s'ignorin tots els events
 * document_* amb clau d'ordre < cut (anàleg al reset d'avaries).
 */

/** Un comentari d'un document, lligat a una versió. */
export interface DocComment {
  id: ID;
  text?: string;
  photoPath?: string;
  at: ISOTimestamp;
  by: UserName;
  versionSeq: number;
  deleted: boolean;
}

/** Una versió d'un document (la 0 és l'original; cada renovació n'incrementa el seq). */
export interface DocVersion extends DocVersionData {
  seq: number;
  at: ISOTimestamp;
  by: UserName;
}

/** Estat derivat d'un document. */
export interface DerivedDocument {
  id: ID; // = docId
  title: string;
  description: string;
  category: DocCategory;
  current: DocVersion; // versió vigent (la més recent)
  versions: DocVersion[]; // totes, de l'original a la vigent
  comments: DocComment[]; // tots (incloent eliminats i d'altres versions); la UI filtra
  createdAt: ISOTimestamp;
  createdBy: UserName;
  deleted: boolean; // eliminat → fora de la llista, dins l'historial
  deletedAt?: ISOTimestamp;
  deletedBy?: UserName;
}

/** Última `document_barrier` per ordre determinista (la que val), o null. */
export function activeDocumentBarrier(
  events: readonly AppEvent[],
): DocumentBarrierEvent | null {
  let found: DocumentBarrierEvent | null = null;
  for (const ev of sortEvents(events)) {
    if (ev.type === 'document_barrier') found = ev;
  }
  return found;
}

const DOCUMENT_EVENT_TYPES = new Set([
  'document_create',
  'document_edit',
  'document_renew',
  'document_comment',
  'document_comment_delete',
  'document_delete',
  'document_restore',
]);

/**
 * Deriva el mapa `docId → DerivedDocument` a partir del log. Els events document_*
 * anteriors a la barrera de reset activa s'ignoren.
 */
export function deriveDocuments(
  events: readonly AppEvent[],
): Map<ID, DerivedDocument> {
  const sorted = sortEvents(events);
  const barrier = activeDocumentBarrier(sorted);
  const docs = new Map<ID, DerivedDocument>();

  for (const ev of sorted) {
    // Ignora els events document_* tallats per la barrera de reset.
    if (
      barrier &&
      DOCUMENT_EVENT_TYPES.has(ev.type) &&
      compareKey(keyOf(ev), barrier.cut) < 0
    ) {
      continue;
    }

    if (ev.type === 'document_create') {
      const version: DocVersion = {
        ...ev.data,
        seq: 0,
        at: ev.occurredAt,
        by: ev.userName,
      };
      docs.set(ev.docId, {
        id: ev.docId,
        title: ev.title,
        description: ev.description,
        category: ev.category,
        current: version,
        versions: [version],
        comments: [],
        createdAt: ev.occurredAt,
        createdBy: ev.userName,
        deleted: false,
      });
    } else if (ev.type === 'document_edit') {
      const d = docs.get(ev.docId);
      if (d) {
        d.title = ev.title;
        d.description = ev.description;
        d.category = ev.category;
        // L'edició substitueix les dades de la versió vigent (no en crea una de nova).
        const updated: DocVersion = {
          ...ev.data,
          seq: d.current.seq,
          at: d.current.at,
          by: d.current.by,
        };
        d.current = updated;
        d.versions[d.versions.length - 1] = updated;
      }
    } else if (ev.type === 'document_renew') {
      const d = docs.get(ev.docId);
      if (d) {
        const version: DocVersion = {
          ...ev.data,
          seq: d.current.seq + 1,
          at: ev.occurredAt,
          by: ev.userName,
        };
        d.versions.push(version);
        d.current = version;
      }
    } else if (ev.type === 'document_comment') {
      const d = docs.get(ev.docId);
      if (d) {
        d.comments.push({
          id: ev.id,
          text: ev.text,
          photoPath: ev.photoPath,
          at: ev.occurredAt,
          by: ev.userName,
          versionSeq: ev.versionSeq,
          deleted: false,
        });
      }
    } else if (ev.type === 'document_comment_delete') {
      const d = docs.get(ev.docId);
      if (d) {
        const c = d.comments.find((x) => x.id === ev.commentId);
        if (c) c.deleted = true;
      }
    } else if (ev.type === 'document_delete') {
      const d = docs.get(ev.docId);
      if (d) {
        d.deleted = true;
        d.deletedAt = ev.occurredAt;
        d.deletedBy = ev.userName;
      }
    } else if (ev.type === 'document_restore') {
      const d = docs.get(ev.docId);
      if (d) {
        d.deleted = false;
        d.deletedAt = undefined;
        d.deletedBy = undefined;
      }
    }
  }

  return docs;
}

/** Comentaris a mostrar a la targeta: versió vigent i no eliminats, en ordre cronològic. */
export function visibleComments(doc: DerivedDocument): DocComment[] {
  return doc.comments.filter(
    (c) => !c.deleted && c.versionSeq === doc.current.seq,
  );
}

/** Documents actius (no eliminats), ordenats per data de validesa més propera primer. */
export function activeDocuments(
  docs: ReadonlyMap<ID, DerivedDocument>,
): DerivedDocument[] {
  return [...docs.values()].filter((d) => !d.deleted).sort(byExpiryThenTitle);
}

/** Ordena per validesa més propera (sense validesa al final), després per títol. */
export function byExpiryThenTitle(
  a: DerivedDocument,
  b: DerivedDocument,
): number {
  const av = a.current.validUntil;
  const bv = b.current.validUntil;
  if (av && bv) {
    if (av !== bv) return av < bv ? -1 : 1;
  } else if (av) {
    return -1;
  } else if (bv) {
    return 1;
  }
  return a.title.localeCompare(b.title, 'ca');
}

/** Agrupa els documents actius per categoria. */
export function documentsByCategory(
  docs: ReadonlyMap<ID, DerivedDocument>,
): Map<DocCategory, DerivedDocument[]> {
  const map = new Map<DocCategory, DerivedDocument[]>();
  for (const d of activeDocuments(docs)) {
    const list = map.get(d.category) ?? [];
    list.push(d);
    map.set(d.category, list);
  }
  return map;
}

/**
 * Dies fins a la caducitat de la versió vigent (fraccionari), o null si no caduca.
 * Negatiu = ja caducat.
 */
export function daysUntilExpiry(
  doc: DerivedDocument,
  now: ISOTimestamp,
): number | null {
  if (!doc.current.validUntil) return null;
  return diffDays(now, doc.current.validUntil);
}

/** Nombre de documents actius que caduquen dins de `withinDays` (inclou ja caducats). */
export function expiringCount(
  docs: Iterable<DerivedDocument>,
  withinDays: number,
  now: ISOTimestamp,
): number {
  let n = 0;
  for (const d of docs) {
    if (d.deleted) continue;
    const days = daysUntilExpiry(d, now);
    if (days !== null && days <= withinDays) n++;
  }
  return n;
}

/** Classe Tailwind del text segons l'estat de caducitat (per a etiquetes a la targeta). */
export function expiryTextClass(daysLeft: number | null): string {
  if (daysLeft === null) return 'text-boat-400';
  if (daysLeft <= 1) return 'text-red-600';
  if (daysLeft <= 30) return 'text-amber-600';
  return 'text-boat-500';
}
