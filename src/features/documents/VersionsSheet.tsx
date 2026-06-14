import { Sheet } from '@/components/ui/Sheet';
import { Card } from '@/components/ui/common';
import { Calendar, Hash, Building2, MapPin, FileText } from '@/components/ui/icons';
import { DocumentFileButton } from './DocumentFileButton';
import type { DerivedDocument, DocVersion } from '@/domain/documents/deriveDocuments';
import { formatDate } from '@/lib/time';
import { t } from '@/text';

/**
 * Full amb les VERSIONS ANTERIORS d'un document (totes menys la vigent), de la més recent a
 * la més antiga. Cada versió mostra les seves dades (validesa, emissió, referència, emissor,
 * ubicació) i permet veure/descarregar el seu PDF si en té. La cronologia completa
 * (edicions, comentaris…) és a l'historial general.
 */
export function VersionsSheet({
  open,
  doc,
  onClose,
}: {
  open: boolean;
  doc: DerivedDocument;
  onClose: () => void;
}) {
  // Versions anteriors a la vigent, més recents primer.
  const previous = doc.versions
    .filter((v) => v.seq !== doc.current.seq)
    .sort((a, b) => b.seq - a.seq);

  return (
    <Sheet open={open} onClose={onClose} title={t.documents.previousVersionsTitle}>
      <div className="flex flex-col gap-3">
        {previous.length === 0 ? (
          <p className="py-6 text-center text-sm text-boat-400">
            {t.documents.noPreviousVersions}
          </p>
        ) : (
          previous.map((v) => <VersionCard key={v.seq} version={v} />)
        )}
      </div>
    </Sheet>
  );
}

function VersionCard({ version: v }: { version: DocVersion }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-boat-700">
          {t.documents.versionLabel(v.seq)}
        </span>
        <span className="text-xs text-boat-400">{t.documents.renewedOn(formatDate(v.at))}</span>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        {v.validUntil && (
          <Row icon={Calendar} value={t.documents.validUntil(formatDate(v.validUntil))} />
        )}
        {v.issuedAt && (
          <Row icon={Calendar} value={`${t.documents.issuedAtLabel}: ${formatDate(v.issuedAt)}`} />
        )}
        {v.reference && <Row icon={Hash} value={v.reference} />}
        {v.issuer && <Row icon={Building2} value={v.issuer} />}
        {v.physicalLocation && <Row icon={MapPin} value={v.physicalLocation} />}
      </dl>

      {v.filePath ? (
        <DocumentFileButton filePath={v.filePath} />
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm text-boat-400">
          <FileText size={16} />
          {t.documents.noFile}
        </p>
      )}
    </Card>
  );
}

function Row({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-2 text-boat-700">
      <Icon size={15} className="shrink-0 text-boat-400" />
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
