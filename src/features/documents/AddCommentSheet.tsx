import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ImagePlus } from '@/components/ui/icons';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { t } from '@/text';

/**
 * Full per afegir un comentari a un document. Un comentari és O text O foto, mai les dues
 * (mateix patró que les actualitzacions d'avaries). Veure AddUpdateSheet.
 */
export function AddCommentSheet({
  open,
  docId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  docId: string;
  onClose: () => void;
  onSubmit: (payload: { text?: string; photoPath?: string }) => void;
}) {
  const [text, setText] = useState('');
  const [photoPath, setPhotoPath] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const previewUrl = useLocationPhoto(photoPath);

  function reset() {
    setText('');
    setPhotoPath(undefined);
    setBusy(false);
  }

  function closeAndReset() {
    reset();
    onClose();
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file);
      const path = await enqueuePhoto(blob, 'document', docId);
      setPhotoPath(path);
    } catch {
      // Imatge no vàlida: no s'actualitza.
    } finally {
      setBusy(false);
    }
  }

  function submitText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit({ text: trimmed });
    reset();
  }

  function submitPhoto() {
    if (!photoPath) return;
    onSubmit({ photoPath });
    reset();
  }

  const showAddPhoto = !text.trim() && !photoPath;

  return (
    <Sheet open={open} onClose={closeAndReset}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-boat-900">{t.documents.addComment}</h2>
          {showAddPhoto && (
            <label
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-boat-100 text-boat-700 active:scale-95"
              aria-label={t.documents.addPhoto}
            >
              <ImagePlus size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
          )}
        </div>

        {photoPath ? (
          <>
            <div className="overflow-hidden rounded-xl bg-boat-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={t.documents.commentPhotoAlt}
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-boat-400">
                  {t.documents.processing}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPhotoPath(undefined)}>
                {t.documents.discardPhoto}
              </Button>
              <Button onClick={submitPhoto}>{t.documents.saveComment}</Button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="min-h-[6rem] rounded-xl border border-boat-100 px-4 py-3"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.documents.commentPlaceholder}
              autoFocus
              disabled={busy}
            />
            <Button onClick={submitText} disabled={!text.trim() || busy}>
              {busy ? t.documents.processing : t.documents.saveComment}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
