import { useState } from 'react';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { Plus, CheckCircle, Pencil, X, Tag } from '@/components/ui/icons';
import { AddUpdateSheet } from './AddUpdateSheet';
import { FaultUpdatePhoto } from './FaultUpdatePhoto';
import { ReportFaultSheet, type FaultFormValue } from './ReportFaultSheet';
import { TagPickerSheet } from './TagPickerSheet';
import type { DerivedFault } from '@/domain/faults/deriveFaults';
import { SEVERITY_BAND } from '@/domain/faults/deriveFaults';
import { normalizeText } from '@/lib/format';
import { relativeFromNow } from '@/lib/time';
import { t } from '@/text';

/**
 * Targeta d'una avaria activa. Plegada: banda de color + títol. Desplegada (en tocar-la):
 * botó d'editar + descripció + etiquetes + actualitzacions + botons d'afegir actualització i
 * solucionar.
 */
export function FaultCard({
  fault,
  expanded,
  onToggle,
  onAddUpdate,
  onResolve,
  onEdit,
  onSetTags,
  allTags,
}: {
  fault: DerivedFault;
  expanded: boolean;
  onToggle: () => void;
  onAddUpdate: (payload: { text?: string; photoPath?: string }) => void;
  onResolve: () => void;
  onEdit: (data: FaultFormValue) => void;
  onSetTags: (tags: string[]) => void;
  allTags: string[];
}) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  /** Afegeix o treu una etiqueta de la llista actual i emet la llista sencera resultant. */
  function toggleTag(tag: string) {
    const key = normalizeText(tag);
    const has = fault.tags.some((existing) => normalizeText(existing) === key);
    const next = has
      ? fault.tags.filter((existing) => normalizeText(existing) !== key)
      : [...fault.tags, tag];
    onSetTags(next);
  }

  return (
    <div className="flex overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Banda lateral de color segons gravetat. */}
      <div className={`w-1.5 shrink-0 ${SEVERITY_BAND[fault.severity]}`} />
      <div className="min-w-0 flex-1 p-4">
        <button type="button" onClick={onToggle} className="w-full text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">{fault.title}</span>
            <span className="shrink-0 text-xs text-boat-400">
              {relativeFromNow(fault.reportedAt)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-boat-500">
            {t.faults.reportedBy(fault.reportedBy)}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3">
            {/* Editar les metadades de l'avaria. */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 self-end text-sm font-medium text-boat-600 active:scale-95"
            >
              <Pencil size={16} />
              {t.faults.edit}
            </button>

            {fault.description && (
              <p className="whitespace-pre-wrap text-sm text-boat-700">{fault.description}</p>
            )}

            {/* Etiquetes: chips amb X per treure + botó "+" per obrir el selector. */}
            <div className="flex flex-wrap items-center gap-1.5">
              {fault.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-boat-100 px-2 py-0.5 text-xs text-boat-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-label={t.faults.removeTagAria(tag)}
                    className="text-boat-500 active:scale-90"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setTagsOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-boat-300 px-2 py-0.5 text-xs font-medium text-boat-600 active:scale-95"
              >
                <Tag size={13} />
                {t.faults.addTag}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
                {t.faults.updates}
              </span>
              {fault.updates.length === 0 ? (
                <p className="text-sm text-boat-400">{t.faults.noUpdates}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {fault.updates.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-lg border border-boat-100 bg-boat-50 p-2 text-sm"
                    >
                      {u.photoPath ? (
                        <FaultUpdatePhoto photoPath={u.photoPath} />
                      ) : (
                        <p className="whitespace-pre-wrap">{u.text}</p>
                      )}
                      <div className="mt-1 flex justify-between text-xs text-boat-400">
                        <span>{t.faults.updateBy(u.by)}</span>
                        <span>{relativeFromNow(u.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => setUpdateOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-boat-100 py-3 text-sm font-semibold text-boat-900 active:scale-95"
            >
              <Plus size={18} />
              {t.faults.addUpdate}
            </button>

            <ConfirmAction
              label={t.faults.resolve}
              message={t.faults.resolveConfirm}
              confirmLabel={t.faults.resolve}
              icon={CheckCircle}
              variant="secondary"
              onConfirm={onResolve}
            />
          </div>
        )}
      </div>

      <AddUpdateSheet
        open={updateOpen}
        faultId={fault.id}
        onClose={() => setUpdateOpen(false)}
        onSubmit={(payload) => {
          onAddUpdate(payload);
          setUpdateOpen(false);
        }}
      />

      <ReportFaultSheet
        open={editOpen}
        initial={{
          title: fault.title,
          description: fault.description,
          severity: fault.severity,
        }}
        onClose={() => setEditOpen(false)}
        onSubmit={(data) => {
          onEdit(data);
          setEditOpen(false);
        }}
      />

      <TagPickerSheet
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        selected={fault.tags}
        allTags={allTags}
        onToggle={toggleTag}
        onCreate={(tag) => onSetTags([...fault.tags, tag])}
      />
    </div>
  );
}
