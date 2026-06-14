import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { Eye } from '@/components/ui/icons';
import { t } from '@/text';

/**
 * Botó per veure el fitxer digital d'un document. Resol la ruta a Storage (blob local offline
 * o URL signada de Supabase) reutilitzant `useLocationPhoto` (serveix per a qualsevol fitxer,
 * no només imatges). En tocar-lo obre el fitxer en una pestanya nova (el navegador mostra el
 * PDF / la imatge amb el seu visor natiu). Mentre la URL no està resolta, el botó queda inactiu.
 */
export function DocumentFileButton({ filePath }: { filePath: string }) {
  const url = useLocationPhoto(filePath);

  return (
    <button
      type="button"
      disabled={!url}
      onClick={() => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }}
      className="flex items-center justify-center gap-2 rounded-xl bg-boat-700 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
    >
      <Eye size={18} />
      {t.documents.viewFile}
    </button>
  );
}
