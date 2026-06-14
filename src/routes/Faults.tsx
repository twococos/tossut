import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useFaults } from '@/hooks/useData';
import { EmptyState } from '@/components/ui/common';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, History as HistoryIcon, Plus } from '@/components/ui/icons';
import { FaultCard } from '@/features/faults/FaultCard';
import { ReportFaultSheet } from '@/features/faults/ReportFaultSheet';
import { activeFaults } from '@/domain/faults/deriveFaults';
import { commitFaultReport, commitFaultUpdate, commitFaultResolve } from '@/db/commands';
import { t } from '@/text';

/** Pàgina d'avaries: llista d'actives + reportar + accés a l'historial. */
export function Faults() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const faults = useFaults() ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const active = useMemo(
    () => activeFaults(new Map(faults.map((f) => [f.id, f]))),
    [faults],
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.faults.title}</h1>
        <Button onClick={() => setReportOpen(true)} className="!w-auto shrink-0 px-4">
          <span className="inline-flex items-center gap-2">
            <Plus size={18} />
            {t.faults.report}
          </span>
        </Button>
      </div>

      {active.length === 0 ? (
        <EmptyState icon={AlertTriangle} text={t.faults.empty} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 lg:items-start">
          {active.map((f) => (
            <li key={f.id}>
              <FaultCard
                fault={f}
                expanded={expandedId === f.id}
                onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                onAddUpdate={(payload) =>
                  userName ? commitFaultUpdate(userName, f.id, payload) : undefined
                }
                onResolve={() => {
                  if (userName) commitFaultResolve(userName, f.id);
                  setExpandedId(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={() => navigate('/faults/history')}>
        <span className="inline-flex items-center justify-center gap-2">
          <HistoryIcon size={18} />
          {t.faults.viewHistory}
        </span>
      </Button>

      <ReportFaultSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={(data) => {
          if (userName) void commitFaultReport(userName, data);
          setReportOpen(false);
        }}
      />
    </div>
  );
}
