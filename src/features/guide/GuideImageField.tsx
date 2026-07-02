import { useState } from 'react';
import { ImagePlus } from '@/components/ui/icons';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { t } from '@/text';

/**
 * Camp d'imatge d'un bloc de la guia. Puja la imatge via la cua offline (`enqueuePhoto`,
 * targetType 'guide') i n'exposa la ruta a Storage (`src`). Si ja n'hi ha, mostra la
 * previsualització i un botó per substituir-la; a més un camp de peu (`caption`) opcional.
 *
 * `sectionId` s'usa per construir la ruta a Storage (`guides/<sectionId>/<uuid>.jpg`),
 * igual que els llocs. La resolució de la previsualització (blob local o URL signada) la
 * fa `useLocationPhoto`, que és genèric per a qualsevol `photoPath`.
 */
export function GuideImageField({
  sectionId,
  src,
  caption,
  onChange,
}: {
  sectionId: string;
  src: string;
  caption?: string;
  onChange: (next: { src: string; caption?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const previewUrl = useLocationPhoto(src || undefined);
  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet re-seleccionar el mateix fitxer
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file);
      const path = await enqueuePhoto(blob, 'guide', sectionId);
      onChange({ src: path, caption });
    } catch {
      // Imatge no vàlida: no s'actualitza.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-boat-50">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={28} className="text-boat-300" />
          )}
        </div>
        <label className="btn-touch flex-1 cursor-pointer bg-boat-100 text-boat-900">
          {busy
            ? t.guideEditor.processing
            : src
              ? t.guideEditor.replaceImage
              : t.guideEditor.addImage}
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
      </div>
      {src && (
        <input
          className={field}
          placeholder={t.guideEditor.captionPlaceholder}
          value={caption ?? ''}
          onChange={(e) => onChange({ src, caption: e.target.value })}
        />
      )}
    </div>
  );
}
