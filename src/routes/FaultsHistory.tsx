import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useAllEvents } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import {
  ScrollText,
  History as HistoryIcon,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from '@/components/ui/icons';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';
import {
  deriveFaults,
  activeFaultBarrier,
  SEVERITY_BAND,
} from '@/domain/faults/deriveFaults';
import type { FaultSeverity } from '@/types/events';
import {
  FaultTimelineRow,
  type FaultTimelineEvent,
} from '@/features/faults/FaultTimeline';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { commitFaultReset, commitFaultReopen } from '@/db/commands';
import { relativeFromNow } from '@/lib/time';
import type { AppEvent } from '@/types/events';
import { t } from '@/text';

const TIMELINE_TYPES = new Set([
  'fault_report',
  'fault_update',
  'fault_edit',
  'fault_tags',
  'fault_resolve',
  'fault_reopen',
]);

interface FaultGroup {
  faultId: string;
  title: string;
  severity?: FaultSeverity;
  resolved: boolean;
  lastAt: string;
  events: FaultTimelineEvent[]; // cronològic invers (més recent a dalt)
}

/** Historial d'avaries AGRUPAT per avaria (cada fila desplega la seva cronologia). Mirall de DocumentsHistory. */
export function FaultsHistory() {
  const rawEvents = useAllEvents();
  const { userName } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  const { groups, hasReset } = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const sorted = sortEvents(events);
    const barrier = activeFaultBarrier(sorted);
    const faultsMap = deriveFaults(events);

    const byFault = new Map<string, FaultTimelineEvent[]>();
    for (const e of sorted) {
      if (!TIMELINE_TYPES.has(e.type)) continue;
      if (barrier && compareKey(keyOf(e), barrier.cut) < 0) continue;
      const ev = e as FaultTimelineEvent;
      const list = byFault.get(ev.faultId) ?? [];
      list.push(ev);
      byFault.set(ev.faultId, list);
    }

    const result: FaultGroup[] = [];
    for (const [faultId, evs] of byFault) {
      const derived = faultsMap.get(faultId);
      const last = evs[evs.length - 1]!;
      result.push({
        faultId,
        title: derived?.title ?? faultId,
        severity: derived?.severity,
        resolved: derived?.resolved ?? false,
        lastAt: last.occurredAt,
        events: [...evs].reverse(),
      });
    }
    // Avaries amb activitat més recent a dalt.
    result.sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
    return { groups: result, hasReset: barrier !== null };
  }, [rawEvents]);

  if (groups.length === 0 && !hasReset) {
    return <EmptyState icon={ScrollText} text={t.faults.historyEmpty} />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.faults.historyTitle}</h1>

      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.faultId}>
            <div
              className={`flex overflow-hidden rounded-2xl bg-white shadow-sm ${
                g.resolved ? 'opacity-60' : ''
              }`}
            >
              {g.severity && <div className={`w-1.5 shrink-0 ${SEVERITY_BAND[g.severity]}`} />}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === g.faultId ? null : g.faultId)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-semibold ${
                        g.resolved ? 'text-boat-500 line-through' : ''
                      }`}
                    >
                      {g.title}
                    </span>
                    <span className="block text-xs text-boat-400">
                      {t.faults.eventCount(g.events.length)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {g.resolved && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {t.faults.resolvedBadge}
                      </span>
                    )}
                    <span className="text-xs text-boat-400">{relativeFromNow(g.lastAt)}</span>
                  </span>
                </button>

                {openId === g.faultId && (
                  <div className="flex flex-col gap-2 border-t border-amber-100 bg-amber-50 p-3">
                    {g.resolved && (
                      <ConfirmAction
                        label={t.faults.reopen}
                        message={t.faults.reopenConfirm}
                        confirmLabel={t.faults.reopen}
                        icon={RotateCcw}
                        variant="secondary"
                        onConfirm={() =>
                          userName ? commitFaultReopen(userName, g.faultId) : undefined
                        }
                      />
                    )}
                    {g.events.map((e) => (
                      <FaultTimelineRow key={e.id} event={e} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {hasReset && (
        <Card className="border-l-4 border-boat-300 bg-boat-50">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-boat-700">
            <HistoryIcon size={16} />
            {t.faults.resetEntryTitle}
          </div>
        </Card>
      )}

      {groups.length === 0 && (
        <EmptyState icon={AlertTriangle} text={t.faults.historyEmpty} />
      )}

      <ConfirmAction
        label={t.faults.resetAll}
        message={t.faults.resetConfirm}
        confirmLabel={t.faults.resetAll}
        icon={Trash2}
        variant="danger"
        onConfirm={() => (userName ? commitFaultReset(userName) : undefined)}
      />
    </div>
  );
}
