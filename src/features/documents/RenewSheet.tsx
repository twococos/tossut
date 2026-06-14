import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { FileCheck, FilePlus } from '@/components/ui/icons';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { dateInputToISO } from '@/lib/time';
import type { DocVersionData } from '@/types/entities';
import { t } from '@/text';

function extFor(file: File): string {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Full per renovar un document: dades de la nova versió (validesa, emissió, referència,
 * emissor, ubicació física) + fitxer nou. En desar es crea una versió nova; l'anterior queda
 * a l'historial. El docId ja existeix, així que el fitxer s'encua amb la seva ruta.
 */
export function RenewSheet({
  open,
  docId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  docId: string;
  onClose: () => void;
  onSubmit: (data: DocVersionData) => void;
}) {
  const [validUntil, setValidUntil] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [reference, setReference] = useState('');
  const [issuer, setIssuer] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
  const [filePath, setFilePath] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function reset() {
    setValidUntil('');
    setIssuedAt('');
    setReference('');
    setIssuer('');
    setPhysicalLocation('');
    setFilePath(undefined);
    setBusy(false);
  }

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
    const data: DocVersionData = {
      ...(dateInputToISO(validUntil) ? { validUntil: dateInputToISO(validUntil) } : {}),
      ...(dateInputToISO(issuedAt) ? { issuedAt: dateInputToISO(issuedAt) } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(issuer.trim() ? { issuer: issuer.trim() } : {}),
      ...(physicalLocation.trim() ? { physicalLocation: physicalLocation.trim() } : {}),
      ...(filePath ? { filePath } : {}),
    };
    onSubmit(data);
    reset();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t.documents.renewTitle}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-boat-500">{t.documents.renewHint}</p>

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
        </div>

        <Button onClick={submit} disabled={busy}>
          {t.documents.renew}
        </Button>
      </div>
    </Sheet>
  );
}
