import type { ID, ISOTimestamp, UserName } from '@/types/entities';
import type { AppEvent, FaultBarrierEvent, FaultSeverity } from '@/types/events';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';

/**
 * Derivació de l'estat de les avaries a partir del log d'esdeveniments.
 *
 * Una avaria no es guarda; es deriva reproduint els seus events (`fault_report`,
 * `fault_update`, `fault_resolve`) en ordre determinista `(occurredAt, deviceId, seq)`.
 * Paral·lel a `deriveResources` / `deriveInventory`. Tots els dispositius deriven el
 * mateix → sense conflictes de sync.
 *
 * Una `fault_barrier` (reset de l'historial) fa que s'ignorin tots els events fault_* amb
 * clau d'ordre < cut (anàleg al reset d'estoc). Veure CONTEXT.md (barrera de tall).
 */

/** Una actualització follow-up d'una avaria. És O de text O de foto (mai les dues). */
export interface FaultUpdate {
  id: ID;
  text?: string;
  photoPath?: string;
  at: ISOTimestamp;
  by: UserName;
}

/** Estat derivat d'una avaria. */
export interface DerivedFault {
  id: ID; // = faultId
  title: string;
  description: string;
  severity: FaultSeverity;
  reportedAt: ISOTimestamp;
  reportedBy: UserName;
  resolved: boolean;
  resolvedAt?: ISOTimestamp;
  resolvedBy?: UserName;
  updates: FaultUpdate[]; // ordenats cronològicament
}

/** Pes d'ordenació per gravetat (més alt = més greu, a dalt de la llista). */
const SEVERITY_WEIGHT: Record<FaultSeverity, number> = {
  red: 3,
  orange: 2,
  yellow: 1,
};

/** Classes Tailwind per a la banda lateral de color d'una targeta d'avaria. */
export const SEVERITY_BAND: Record<FaultSeverity, string> = {
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-600',
};

/** Classes Tailwind per a un punt/badge de color (fons) segons gravetat. */
export const SEVERITY_DOT: Record<FaultSeverity, string> = {
  yellow: 'bg-yellow-400 text-yellow-950',
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-600 text-white',
};

/** Classes Tailwind per al text de color segons gravetat. */
export const SEVERITY_TEXT: Record<FaultSeverity, string> = {
  yellow: 'text-yellow-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

/** Les gravetats en ordre de selecció (lleu → greu). */
export const SEVERITIES: FaultSeverity[] = ['yellow', 'orange', 'red'];

/** Última `fault_barrier` per ordre determinista (la que val), o null. */
export function activeFaultBarrier(
  events: readonly AppEvent[],
): FaultBarrierEvent | null {
  let found: FaultBarrierEvent | null = null;
  for (const ev of sortEvents(events)) {
    if (ev.type === 'fault_barrier') found = ev;
  }
  return found;
}

/**
 * Deriva el mapa `faultId → DerivedFault` a partir del log. Els events fault_* anteriors a
 * la barrera de reset activa s'ignoren.
 */
export function deriveFaults(events: readonly AppEvent[]): Map<ID, DerivedFault> {
  const sorted = sortEvents(events);
  const barrier = activeFaultBarrier(sorted);
  const faults = new Map<ID, DerivedFault>();

  for (const ev of sorted) {
    // Ignora els events fault_* tallats per la barrera de reset.
    if (
      barrier &&
      (ev.type === 'fault_report' ||
        ev.type === 'fault_update' ||
        ev.type === 'fault_resolve' ||
        ev.type === 'fault_reopen') &&
      compareKey(keyOf(ev), barrier.cut) < 0
    ) {
      continue;
    }

    if (ev.type === 'fault_report') {
      faults.set(ev.faultId, {
        id: ev.faultId,
        title: ev.title,
        description: ev.description,
        severity: ev.severity,
        reportedAt: ev.occurredAt,
        reportedBy: ev.userName,
        resolved: false,
        updates: [],
      });
    } else if (ev.type === 'fault_update') {
      const f = faults.get(ev.faultId);
      if (f) {
        f.updates.push({
          id: ev.id,
          text: ev.text,
          photoPath: ev.photoPath,
          at: ev.occurredAt,
          by: ev.userName,
        });
      }
    } else if (ev.type === 'fault_resolve') {
      const f = faults.get(ev.faultId);
      if (f) {
        f.resolved = true;
        f.resolvedAt = ev.occurredAt;
        f.resolvedBy = ev.userName;
      }
    } else if (ev.type === 'fault_reopen') {
      const f = faults.get(ev.faultId);
      if (f) {
        f.resolved = false;
        f.resolvedAt = undefined;
        f.resolvedBy = undefined;
      }
    }
  }

  return faults;
}

/**
 * Avaries actives (no resoltes), ordenades per gravetat (vermell → taronja → groc) i
 * després per data de report descendent (les més noves a dalt dins la mateixa gravetat).
 */
export function activeFaults(faults: ReadonlyMap<ID, DerivedFault>): DerivedFault[] {
  return [...faults.values()]
    .filter((f) => !f.resolved)
    .sort((a, b) => {
      const w = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (w !== 0) return w;
      return a.reportedAt < b.reportedAt ? 1 : a.reportedAt > b.reportedAt ? -1 : 0;
    });
}

/** La gravetat més alta entre les avaries actives, o null si no n'hi ha cap. */
export function highestActiveSeverity(
  faults: ReadonlyMap<ID, DerivedFault>,
): FaultSeverity | null {
  let best: FaultSeverity | null = null;
  for (const f of faults.values()) {
    if (f.resolved) continue;
    if (best === null || SEVERITY_WEIGHT[f.severity] > SEVERITY_WEIGHT[best]) {
      best = f.severity;
    }
  }
  return best;
}
