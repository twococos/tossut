import { Card } from '@/components/ui/common';
import { faultEventIcon, ImagePlus } from '@/components/ui/icons';
import { relativeFromNow } from '@/lib/time';
import type {
  FaultReportEvent,
  FaultUpdateEvent,
  FaultResolveEvent,
  FaultReopenEvent,
} from '@/types/events';
import { t } from '@/text';

export type FaultTimelineEvent =
  | FaultReportEvent
  | FaultUpdateEvent
  | FaultResolveEvent
  | FaultReopenEvent;

function kindOf(ev: FaultTimelineEvent) {
  switch (ev.type) {
    case 'fault_report':
      return 'report' as const;
    case 'fault_update':
      return 'update' as const;
    case 'fault_resolve':
      return 'resolve' as const;
    case 'fault_reopen':
      return 'reopen' as const;
  }
}

/** Una fila de la cronologia d'una avaria (report / update / resolve / reopen). Mirall de DocumentTimelineRow. */
export function FaultTimelineRow({ event }: { event: FaultTimelineEvent }) {
  const kind = kindOf(event);
  const Icon = faultEventIcon(kind);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-boat-700">
          <Icon size={16} />
          {t.faults.eventKind[kind]}
        </span>
        <span className="text-boat-400">{relativeFromNow(event.occurredAt)}</span>
      </div>
      {event.type === 'fault_update' &&
        (event.photoPath ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-boat-500">
            <ImagePlus size={15} />
            {t.faults.photoUpdate}
          </p>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-boat-600">{event.text}</p>
        ))}
      <div className="mt-1 text-xs text-boat-400">{event.userName}</div>
    </Card>
  );
}
