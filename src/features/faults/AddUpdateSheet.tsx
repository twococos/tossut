import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ImagePlus } from '@/components/ui/icons';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { t } from '@/text';

/**
 * Full per afegir una actualització a una avaria. Una actualització és O text O foto, mai
 * les dues. Mentre no s'ha escrit text ni triat foto, surt una icona d'afegir imatge a la
 * dreta del títol del panell. En triar una foto es mostra la previsualització (al lloc del
 * quadre de text) amb opcions desar/sortir.
 */
export function AddUpdateSheet({
  open,
  faultId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  faultId: string;
  onClose: () => void;
  onSubmit: (payload: { text?: string; photoPath?: string }) => void;
}) {
  const [text, setText] = useState('');
  const [photoPath, setPhotoPath] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  // Guarda anti-doble-submissió: un segon toc al botó "Desar" abans que el panell es
  // tanqui emetia un segon fault_update idèntic (mateix seq) i bloquejava el sync.
  const [submitting, setSubmitting] = useState(false);
  const previewUrl = useLocationPhoto(photoPath);

  function reset() {
    setText('');
    setPhotoPath(undefined);
    setBusy(false);
    setSubmitting(false);
  }

  function closeAndReset() {
    reset();
    onClose();
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet re-seleccionar el mateix fitxer
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file);
      const path = await enqueuePhoto(blob, 'fault', faultId);
      setPhotoPath(path);
    } catch {
      // Imatge no vàlida: simplement no s'actualitza.
    } finally {
      setBusy(false);
    }
  }

  function submitText() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    onSubmit({ text: trimmed });
    reset();
  }

  function submitPhoto() {
    if (!photoPath || submitting) return;
    setSubmitting(true);
    onSubmit({ photoPath });
    reset();
  }

  // La icona d'afegir imatge només té sentit mentre no hi ha res escrit ni cap foto.
  const showAddPhoto = !text.trim() && !photoPath;

  return (
    <Sheet open={open} onClose={closeAndReset}>
      <div className="flex flex-col gap-4">
        {/* Capçalera pròpia: títol + icona d'afegir imatge a la seva dreta. */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-boat-900">{t.faults.addUpdate}</h2>
          {showAddPhoto && (
            <label
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-boat-100 text-boat-700 active:scale-95"
              aria-label={t.faults.addPhoto}
            >
              <ImagePlus size={20} />
              {/* Sense `capture`: el sistema deixa triar entre càmera i galeria. */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickPhoto}
              />
            </label>
          )}
        </div>

        {photoPath ? (
          // Mode foto: previsualització al lloc del quadre de text + desar/sortir.
          <>
            <div className="overflow-hidden rounded-xl bg-boat-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={t.faults.updatePhotoAlt}
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-boat-400">
                  {t.faults.processing}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPhotoPath(undefined)}>
                {t.faults.discardPhoto}
              </Button>
              <Button onClick={submitPhoto} disabled={submitting}>
                {t.faults.saveUpdate}
              </Button>
            </div>
          </>
        ) : (
          // Mode text.
          <>
            <textarea
              className="min-h-[6rem] rounded-xl border border-boat-100 px-4 py-3"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.faults.updatePlaceholder}
              autoFocus
              disabled={busy}
            />
            <Button onClick={submitText} disabled={!text.trim() || busy || submitting}>
              {busy ? t.faults.processing : t.faults.saveUpdate}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
