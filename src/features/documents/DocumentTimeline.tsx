import { Card } from '@/components/ui/common';
import { documentEventIcon, ImagePlus } from '@/components/ui/icons';
import { relativeFromNow, formatDate } from '@/lib/time';
import type {
  DocumentCreateEvent,
  DocumentEditEvent,
  DocumentRenewEvent,
  DocumentCommentEvent,
  DocumentCommentDeleteEvent,
  DocumentDeleteEvent,
  DocumentRestoreEvent,
} from '@/types/events';
import { t } from '@/text';

export type DocumentTimelineEvent =
  | DocumentCreateEvent
  | DocumentEditEvent
  | DocumentRenewEvent
  | DocumentCommentEvent
  | DocumentCommentDeleteEvent
  | DocumentDeleteEvent
  | DocumentRestoreEvent;

function kindOf(ev: DocumentTimelineEvent) {
  switch (ev.type) {
    case 'document_create':
      return 'create' as const;
    case 'document_edit':
      return 'edit' as const;
    case 'document_renew':
      return 'renew' as const;
    case 'document_comment':
      return 'comment' as const;
    case 'document_comment_delete':
      return 'comment_delete' as const;
    case 'document_delete':
      return 'delete' as const;
    case 'document_restore':
      return 'restore' as const;
  }
}

/** Detall secundari d'una fila de l'historial segons el tipus d'event. */
function detailOf(ev: DocumentTimelineEvent): { text?: string; photo?: boolean } {
  if (ev.type === 'document_renew' || ev.type === 'document_create') {
    const validUntil = ev.data.validUntil;
    return validUntil ? { text: t.documents.validUntil(formatDate(validUntil)) } : {};
  }
  if (ev.type === 'document_comment') {
    return ev.photoPath ? { photo: true } : { text: ev.text };
  }
  return {};
}

/** Una fila de l'historial d'un document (cronologia). Reutilitzable a la targeta i a l'historial general. */
export function DocumentTimelineRow({ event }: { event: DocumentTimelineEvent }) {
  const kind = kindOf(event);
  const Icon = documentEventIcon(kind);
  const detail = detailOf(event);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-boat-700">
          <Icon size={16} />
          {t.documents.eventKind[kind]}
        </span>
        <span className="text-boat-400">{relativeFromNow(event.occurredAt)}</span>
      </div>
      {detail.photo ? (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-boat-500">
          <ImagePlus size={15} />
          {t.documents.photoComment}
        </p>
      ) : (
        detail.text && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-boat-600">{detail.text}</p>
        )
      )}
      <div className="mt-1 text-xs text-boat-400">{event.userName}</div>
    </Card>
  );
}
