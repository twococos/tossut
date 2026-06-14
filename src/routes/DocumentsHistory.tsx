import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useAllEvents } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { ScrollText, History as HistoryIcon, Trash2, FileText, RotateCcw } from '@/components/ui/icons';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';
import {
  deriveDocuments,
  activeDocumentBarrier,
} from '@/domain/documents/deriveDocuments';
import {
  DocumentTimelineRow,
  type DocumentTimelineEvent,
} from '@/features/documents/DocumentTimeline';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { commitDocumentReset, commitDocumentRestore } from '@/db/commands';
import { relativeFromNow } from '@/lib/time';
import type { AppEvent } from '@/types/events';
import { t } from '@/text';

const TIMELINE_TYPES = new Set([
  'document_create',
  'document_edit',
  'document_renew',
  'document_comment',
  'document_comment_delete',
  'document_delete',
  'document_restore',
]);

interface DocGroup {
  docId: string;
  title: string;
  deleted: boolean;
  lastAt: string;
  events: DocumentTimelineEvent[]; // cronològic invers (més recent a dalt)
}

/** Historial general de documents, AGRUPAT per document (cada fila desplega la seva cronologia). */
export function DocumentsHistory() {
  const rawEvents = useAllEvents();
  const { userName } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);

  const { groups, hasReset } = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const sorted = sortEvents(events);
    const barrier = activeDocumentBarrier(sorted);
    const docsMap = deriveDocuments(events);

    const byDoc = new Map<string, DocumentTimelineEvent[]>();
    for (const e of sorted) {
      if (!TIMELINE_TYPES.has(e.type)) continue;
      if (barrier && compareKey(keyOf(e), barrier.cut) < 0) continue;
      const ev = e as DocumentTimelineEvent;
      const list = byDoc.get(ev.docId) ?? [];
      list.push(ev);
      byDoc.set(ev.docId, list);
    }

    const result: DocGroup[] = [];
    for (const [docId, evs] of byDoc) {
      const derived = docsMap.get(docId);
      const last = evs[evs.length - 1]!;
      result.push({
        docId,
        title: derived?.title ?? docId,
        deleted: derived?.deleted ?? false,
        lastAt: last.occurredAt,
        events: [...evs].reverse(),
      });
    }
    // Documents amb activitat més recent a dalt.
    result.sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
    return { groups: result, hasReset: barrier !== null };
  }, [rawEvents]);

  if (groups.length === 0 && !hasReset) {
    return <EmptyState icon={ScrollText} text={t.documents.historyEmpty} />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.documents.historyTitle}</h1>

      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.docId}>
            <div
              className={`overflow-hidden rounded-2xl bg-white shadow-sm ${
                g.deleted ? 'opacity-60' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === g.docId ? null : g.docId)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={18} className="shrink-0 text-boat-400" />
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-semibold ${
                        g.deleted ? 'text-boat-500 line-through' : ''
                      }`}
                    >
                      {g.title}
                    </span>
                    <span className="block text-xs text-boat-400">
                      {t.documents.eventCount(g.events.length)}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {g.deleted && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                      {t.documents.deletedBadge}
                    </span>
                  )}
                  <span className="text-xs text-boat-400">{relativeFromNow(g.lastAt)}</span>
                </span>
              </button>

              {openId === g.docId && (
                <div className="flex flex-col gap-2 border-t border-amber-100 bg-amber-50 p-3">
                  {g.deleted && (
                    <ConfirmAction
                      label={t.documents.restore}
                      message={t.documents.restoreConfirm}
                      confirmLabel={t.documents.restore}
                      icon={RotateCcw}
                      variant="secondary"
                      onConfirm={() =>
                        userName ? commitDocumentRestore(userName, g.docId) : undefined
                      }
                    />
                  )}
                  {g.events.map((e) => (
                    <DocumentTimelineRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {hasReset && (
        <Card className="border-l-4 border-boat-300 bg-boat-50">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-boat-700">
            <HistoryIcon size={16} />
            {t.documents.resetEntryTitle}
          </div>
        </Card>
      )}

      <ConfirmAction
        label={t.documents.resetAll}
        message={t.documents.resetConfirm}
        confirmLabel={t.documents.resetAll}
        icon={Trash2}
        variant="danger"
        onConfirm={() => (userName ? commitDocumentReset(userName) : undefined)}
      />
    </div>
  );
}
