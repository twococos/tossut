import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import type { FaultSeverity } from '@/types/events';
import { SEVERITIES, SEVERITY_DOT } from '@/domain/faults/deriveFaults';
import { t } from '@/text';

/** Dades editables d'una avaria (títol, descripció, gravetat). */
export interface FaultFormValue {
  title: string;
  description: string;
  severity: FaultSeverity;
}

/**
 * Full per crear o editar una avaria: títol, descripció i gravetat. En mode editar
 * (`initial` informat) precarrega els valors i mostra la capçalera/botó d'edició; en mode
 * crear parteix de buit i es reinicia en tancar.
 */
export function ReportFaultSheet({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FaultFormValue) => void;
  /** Si s'informa, el full funciona en mode editar (precarrega i canvia els textos). */
  initial?: FaultFormValue;
}) {
  const editing = initial !== undefined;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [severity, setSeverity] = useState<FaultSeverity>(initial?.severity ?? 'yellow');

  // En reobrir el full, sincronitza els camps amb els valors inicials (editar) o buida (crear).
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setSeverity(initial?.severity ?? 'yellow');
  }, [open, initial]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({ title: trimmed, description: description.trim(), severity });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t.faults.editTitle : t.faults.report}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.titleLabel}</span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.faults.titlePlaceholder}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.descriptionLabel}</span>
          <textarea
            className="min-h-[5rem] rounded-xl border border-boat-100 px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.faults.descriptionPlaceholder}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.faults.severityQuestion}</span>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  severity === s
                    ? `${SEVERITY_DOT[s]} ring-2 ring-boat-900 ring-offset-1`
                    : 'bg-boat-50 text-boat-600'
                }`}
              >
                {t.faults.severity[s]}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={submit} disabled={!title.trim()}>
          {editing ? t.faults.saveEdit : t.faults.report}
        </Button>
      </div>
    </Sheet>
  );
}
