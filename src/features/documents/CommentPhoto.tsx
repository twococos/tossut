import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { Photo } from '@/components/ui/Photo';
import { t } from '@/text';

/**
 * Foto d'un comentari de document dins la targeta. Resol la ruta a Storage (blob local offline
 * o URL signada) i la mostra clicable (visor a pantalla completa). Mirall de FaultUpdatePhoto.
 */
export function CommentPhoto({ photoPath }: { photoPath: string }) {
  const url = useLocationPhoto(photoPath);
  if (!url) {
    return <div className="h-32 w-full animate-pulse rounded-lg bg-boat-100" />;
  }
  return (
    <Photo
      src={url}
      alt={t.documents.commentPhotoAlt}
      className="max-h-56 w-full rounded-lg object-cover"
    />
  );
}
