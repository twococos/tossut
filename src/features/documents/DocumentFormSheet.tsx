import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { FileCheck, FilePlus } from '@/components/ui/icons';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { isoToDateInput, dateInputToISO } from '@/lib/time';
import { DOC_CATEGORIES, type DocCategory, type DocVersionData } from '@/types/entities';
import { newId } from '@/lib/id';
import { t } from '@/text';

export interface DocumentFormValue {
  title: string;
  description: string;
  category: DocCategory;
  data: DocVersionData;
}

/** Dades inicials per al mode edició (document existent). */
export interface DocumentFormInitial {
  docId: string;
  title: string;
  description: string;
  category: DocCategory;
  data: DocVersionData;
}

/** Extensió de la ruta a Storage a partir del tipus MIME del fitxer triat. */
function extFor(file: File): string {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Full per crear o editar un document. En crear, el `docId` es genera aquí perquè el fitxer
 * adjunt s'encui amb la ruta correcta abans de desar. En editar, es reben les dades inicials.
 * Els PDF es pugen tal qual; les imatges es redimensionen (com a la resta de l'app).
 */
export function DocumentFormSheet({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: DocumentFormInitial;
  onClose: () => void;
  onSubmit: (value: DocumentFormValue) => void;
}) {
  // En mode crear, fixem un docId estable mentre el full està obert (per a la ruta del fitxer).
  const [docId] = useState(() => initial?.docId ?? newId());
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<DocCategory>(initial?.category ?? 'inspection');
  const [validUntil, setValidUntil] = useState(isoToDateInput(initial?.data.validUntil));
  const [issuedAt, setIssuedAt] = useState(isoToDateInput(initial?.data.issuedAt));
  const [reference, setReference] = useState(initial?.data.reference ?? '');
  const [issuer, setIssuer] = useState(initial?.data.issuer ?? '');
  const [physicalLocation, setPhysicalLocation] = useState(
    initial?.data.physicalLocation ?? '',
  );
  const [filePath, setFilePath] = useState<string | undefined>(initial?.data.filePath);
  const [busy, setBusy] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const isImage = file.type.startsWith('image/');
      const blob = isImage ? await resizeImageToBlob(file) : file;
      const ext = isImage ? 'jpg' : extFor(file);
      const mime = isImage ? 'image/jpeg' : file.type || 'application/octet-stream';
      const path = await enqueuePhoto(blob, 'document', docId, { mime, ext });
      setFilePath(path);
    } catch {
      // Fitxer no vàlid: no s'actualitza.
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const data: DocVersionData = {
      ...(dateInputToISO(validUntil) ? { validUntil: dateInputToISO(validUntil) } : {}),
      ...(dateInputToISO(issuedAt) ? { issuedAt: dateInputToISO(issuedAt) } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(issuer.trim() ? { issuer: issuer.trim() } : {}),
      ...(physicalLocation.trim() ? { physicalLocation: physicalLocation.trim() } : {}),
      ...(filePath ? { filePath } : {}),
    };
    onSubmit({ title: trimmed, description: description.trim(), category, data });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? t.documents.edit : t.documents.newDocument}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.documents.titleLabel}</span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.documents.titlePlaceholder}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.documents.categoryLabel}</span>
          <select
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocCategory)}
          >
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.documents.category[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">
            {t.documents.descriptionLabel}
          </span>
          <textarea
            className="min-h-[4rem] rounded-xl border border-boat-100 px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.documents.descriptionPlaceholder}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-boat-700">
              {t.documents.validUntilLabel}
            </span>
            <input
              type="date"
              className="rounded-xl border border-boat-100 px-3 py-3"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-boat-700">
              {t.documents.issuedAtLabel}
            </span>
            <input
              type="date"
              className="rounded-xl border border-boat-100 px-3 py-3"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.documents.referenceLabel}</span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t.documents.referencePlaceholder}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.documents.issuerLabel}</span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder={t.documents.issuerPlaceholder}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">
            {t.documents.physicalLocationLabel}
          </span>
          <input
            className="rounded-xl border border-boat-100 px-4 py-3"
            value={physicalLocation}
            onChange={(e) => setPhysicalLocation(e.target.value)}
            placeholder={t.documents.physicalLocationPlaceholder}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-boat-700">{t.documents.fileLabel}</span>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-boat-100 py-3 text-sm font-semibold text-boat-900 active:scale-95">
            {filePath ? <FileCheck size={18} /> : <FilePlus size={18} />}
            {busy
              ? t.documents.processing
              : filePath
                ? t.documents.changeFile
                : t.documents.addFile}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </label>
          {filePath && !busy && (
            <span className="text-xs text-boat-500">{t.documents.fileAttached}</span>
          )}
        </div>

        <Button onClick={submit} disabled={!title.trim() || busy}>
          {t.documents.save}
        </Button>
      </div>
    </Sheet>
  );
}
