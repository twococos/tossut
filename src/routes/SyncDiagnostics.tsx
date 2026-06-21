import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/common';
import { useSync } from '@/sync/SyncProvider';
import {
  getSyncDiagnostics,
  repairDuplicateDeviceSeq,
  type SyncDiagnostics as Diag,
} from '@/db/repositories/events.repo';
import { relativeFromNow } from '@/lib/time';
import { t } from '@/text';

/**
 * Pantalla de diagnòstic de sincronització. Pensada per al mòbil (PWA) on no hi ha
 * consola de desenvolupador: mostra l'estat intern del sync i detecta les causes
 * conegudes que bloquegen el push. El botó "Copiar tot" posa un resum al porta-retalls
 * per poder-lo enviar a qui ajudi a depurar.
 */
export function SyncDiagnostics() {
  const { syncNow } = useSync();
  const [diag, setDiag] = useState<Diag | null>(null);
  const [copied, setCopied] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setDiag(await getSyncDiagnostics());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSync = useCallback(async () => {
    await syncNow();
    await load();
  }, [syncNow, load]);

  const onRepair = useCallback(async () => {
    setRepairing(true);
    setRepairMsg(null);
    try {
      const n = await repairDuplicateDeviceSeq();
      setRepairMsg(t.diagnostics.repairDone(n));
      if (n > 0) await syncNow();
    } finally {
      setRepairing(false);
      await load();
    }
  }, [syncNow, load]);

  const onCopy = useCallback(async () => {
    if (!diag) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si el porta-retalls falla (permís denegat), no fem res: el JSON ja és visible.
    }
  }, [diag]);

  if (!diag) {
    return <div className="pt-2 text-boat-600">{t.common.loading}</div>;
  }

  const problems: string[] = [];
  if (diag.duplicateDeviceSeq.length > 0)
    problems.push(t.diagnostics.probDuplicate(diag.duplicateDeviceSeq.length));
  if (diag.seqCounterBehind) problems.push(t.diagnostics.probSeqBehind);
  if (diag.deviceIdMismatch) problems.push(t.diagnostics.probDeviceMismatch);
  if (diag.nonUuidUpserts.length > 0)
    problems.push(t.diagnostics.probNonUuid(diag.nonUuidUpserts.length));

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-bold">{t.diagnostics.title}</h1>
      <p className="text-sm text-boat-600">{t.diagnostics.intro}</p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void load()} className="!w-auto flex-1">
          {t.diagnostics.refresh}
        </Button>
        <Button onClick={() => void onCopy()} className="!w-auto flex-1">
          {copied ? t.diagnostics.copied : t.diagnostics.copy}
        </Button>
      </div>
      <Button variant="secondary" onClick={() => void onSync()}>
        {t.diagnostics.runSync}
      </Button>

      {/* Problemes detectats */}
      <Card className="flex flex-col gap-2">
        <span className="text-sm font-medium text-boat-700">
          {t.diagnostics.sectionProblems}
        </span>
        {problems.length === 0 ? (
          <p className="text-sm text-emerald-700">{t.diagnostics.noProblems}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {problems.map((p, i) => (
              <li
                key={i}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {p}
              </li>
            ))}
          </ul>
        )}
        {diag.duplicateDeviceSeq.length > 0 && (
          <Button onClick={() => void onRepair()} disabled={repairing}>
            {repairing ? t.diagnostics.repairing : t.diagnostics.repair}
          </Button>
        )}
        {repairMsg && <p className="text-sm text-boat-600">{repairMsg}</p>}
      </Card>

      {/* Estat */}
      <Card className="flex flex-col gap-1 text-sm">
        <span className="mb-1 font-medium text-boat-700">
          {t.diagnostics.sectionState}
        </span>
        <Row label={t.diagnostics.deviceId} value={diag.deviceId} mono />
        <Row label={t.diagnostics.localSeq} value={String(diag.localSeq)} />
        <Row label={t.diagnostics.maxSeq} value={String(diag.maxSeqForDevice)} />
        <Row label={t.diagnostics.totalEvents} value={String(diag.totalEvents)} />
        <Row label={t.diagnostics.pendingEvents} value={String(diag.pendingEvents)} />
      </Card>

      {/* Últim error */}
      <Card className="flex flex-col gap-1 text-sm">
        <span className="mb-1 font-medium text-boat-700">
          {t.diagnostics.sectionError}
        </span>
        {diag.lastSyncError ? (
          <>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {diag.lastSyncError}
            </pre>
            {diag.lastSyncErrorAt && (
              <span className="text-xs text-boat-500">
                {t.diagnostics.errorAt(relativeFromNow(diag.lastSyncErrorAt))}
              </span>
            )}
          </>
        ) : (
          <p className="text-boat-500">{t.diagnostics.noError}</p>
        )}
      </Card>

      {/* Pendents */}
      <Card className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-boat-700">
          {t.diagnostics.sectionPending}
        </span>
        {diag.pendingDetail.length === 0 ? (
          <p className="text-boat-500">{t.diagnostics.noPending}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {diag.pendingDetail.map((p) => (
              <li
                key={p.id}
                className="rounded-lg bg-boat-50 px-3 py-2 font-mono text-xs text-boat-700"
              >
                {p.type} · seq={p.seq} · {p.occurredAt}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-boat-600">{label}</span>
      <span className={`text-right text-boat-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
