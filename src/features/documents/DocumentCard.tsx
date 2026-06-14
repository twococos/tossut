import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { ConfirmIconButton } from '@/components/ui/ConfirmIconButton';
import {
  Pencil,
  RefreshCw,
  Trash2,
  History as HistoryIcon,
  Plus,
  Calendar,
  MapPin,
  Hash,
  Building2,
  FileText,
} from '@/components/ui/icons';
import { AddCommentSheet } from './AddCommentSheet';
import { CommentPhoto } from './CommentPhoto';
import { DocumentFileButton } from './DocumentFileButton';
import { DocumentFormSheet, type DocumentFormValue } from './DocumentFormSheet';
import { RenewSheet } from './RenewSheet';
import { VersionsSheet } from './VersionsSheet';
import {
  visibleComments,
  daysUntilExpiry,
  expiryTextClass,
  type DerivedDocument,
} from '@/domain/documents/deriveDocuments';
import type { DocVersionData } from '@/types/entities';
import {
  commitDocumentEdit,
  commitDocumentRenew,
  commitDocumentComment,
  commitDocumentCommentDelete,
  commitDocumentDelete,
} from '@/db/commands';
import { relativeFromNow, formatDate, nowISO } from '@/lib/time';
import { t } from '@/text';

/**
 * Etiqueta curta de l'estat de caducitat de la versió vigent. Fins a 30 dies es compta en
 * dies; a partir d'aquí en mesos (arrodonint a la baixa). La data exacta es veu desplegant.
 */
function expiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return t.documents.noExpiry;
  if (daysLeft < 0) return t.documents.expired;
  if (daysLeft < 1) return t.documents.expiresToday;
  if (daysLeft <= 30) return t.documents.expiresIn(daysLeft);
  const months = Math.floor(daysLeft / 30);
  return t.documents.expiresInMonths(months);
}

/**
 * Targeta d'un document. Plegada: títol + estat de caducitat. Desplegada: totes les dades de
 * la versió vigent, botó per veure el fitxer, comentaris de la versió vigent, i botons
 * d'editar / renovar / historial del document / eliminar.
 */
export function DocumentCard({
  doc,
  expanded,
  onToggle,
}: {
  doc: DerivedDocument;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { userName } = useAuth();
  const [commentOpen, setCommentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const v = doc.current;
  const daysLeft = daysUntilExpiry(doc, nowISO());
  const comments = visibleComments(doc);

  function onEdit(value: DocumentFormValue) {
    if (userName) void commitDocumentEdit(userName, doc.id, value);
    setEditOpen(false);
  }
  function onRenew(data: DocVersionData) {
    if (userName) void commitDocumentRenew(userName, doc.id, data);
    setRenewOpen(false);
  }
  function onAddComment(payload: { text?: string; photoPath?: string }) {
    if (userName) void commitDocumentComment(userName, doc.id, v.seq, payload);
    setCommentOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{doc.title}</span>
          <span className={`shrink-0 text-xs font-semibold ${expiryTextClass(daysLeft)}`}>
            {expiryLabel(daysLeft)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-boat-500">
          {t.documents.category[doc.category]}
          {doc.current.seq > 0 && ` · ${t.documents.versionLabel(doc.current.seq)}`}
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {doc.description && (
            <p className="whitespace-pre-wrap text-sm text-boat-700">{doc.description}</p>
          )}

          {/* Dades de la versió vigent. */}
          <dl className="flex flex-col gap-1.5 text-sm">
            {v.validUntil && (
              <DataRow icon={Calendar} value={t.documents.validUntil(formatDate(v.validUntil))} />
            )}
            {v.issuedAt && (
              <DataRow
                icon={Calendar}
                value={`${t.documents.issuedAtLabel}: ${formatDate(v.issuedAt)}`}
              />
            )}
            {v.reference && <DataRow icon={Hash} value={v.reference} />}
            {v.issuer && <DataRow icon={Building2} value={v.issuer} />}
            {v.physicalLocation && <DataRow icon={MapPin} value={v.physicalLocation} />}
          </dl>

          {v.filePath ? (
            <DocumentFileButton filePath={v.filePath} />
          ) : (
            <p className="inline-flex items-center gap-1.5 text-sm text-boat-400">
              <FileText size={16} />
              {t.documents.noFile}
            </p>
          )}

          {/* Comentaris de la versió vigent. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
              {t.documents.comments}
            </span>
            {comments.length === 0 ? (
              <p className="text-sm text-boat-400">{t.documents.noComments}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-boat-100 bg-boat-50 p-2 text-sm"
                  >
                    {c.photoPath ? (
                      <CommentPhoto photoPath={c.photoPath} />
                    ) : (
                      <p className="whitespace-pre-wrap">{c.text}</p>
                    )}
                    <div className="mt-1 flex items-center justify-between text-xs text-boat-400">
                      <span>
                        {t.documents.commentBy(c.by)} · {relativeFromNow(c.at)}
                      </span>
                      <ConfirmIconButton
                        ariaLabel={t.documents.deleteComment}
                        title={t.documents.deleteComment}
                        message={t.documents.deleteCommentConfirm}
                        confirmLabel={t.documents.deleteComment}
                        onConfirm={() =>
                          userName
                            ? commitDocumentCommentDelete(userName, doc.id, c.id)
                            : undefined
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCommentOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-boat-100 py-3 text-sm font-semibold text-boat-900 active:scale-95"
          >
            <Plus size={18} />
            {t.documents.addComment}
          </button>

          {/* Accions del document. */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-boat-100 py-3 text-sm font-semibold text-boat-900 active:scale-95"
            >
              <Pencil size={18} />
              {t.documents.edit}
            </button>
            <button
              type="button"
              onClick={() => setRenewOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-boat-100 py-3 text-sm font-semibold text-boat-900 active:scale-95"
            >
              <RefreshCw size={18} />
              {t.documents.renew}
            </button>
          </div>

          {doc.current.seq > 0 && (
            <button
              type="button"
              onClick={() => setVersionsOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-boat-50 py-2.5 text-sm font-semibold text-boat-600 active:scale-95"
            >
              <HistoryIcon size={18} />
              {t.documents.previousVersions}
            </button>
          )}

          <ConfirmAction
            label={t.documents.delete}
            message={t.documents.deleteConfirm}
            confirmLabel={t.documents.delete}
            icon={Trash2}
            variant="danger"
            onConfirm={() => (userName ? commitDocumentDelete(userName, doc.id) : undefined)}
          />
        </div>
      )}

      <AddCommentSheet
        open={commentOpen}
        docId={doc.id}
        onClose={() => setCommentOpen(false)}
        onSubmit={onAddComment}
      />
      {editOpen && (
        <DocumentFormSheet
          open={editOpen}
          initial={{
            docId: doc.id,
            title: doc.title,
            description: doc.description,
            category: doc.category,
            data: {
              validUntil: v.validUntil,
              issuedAt: v.issuedAt,
              reference: v.reference,
              issuer: v.issuer,
              physicalLocation: v.physicalLocation,
              filePath: v.filePath,
            },
          }}
          onClose={() => setEditOpen(false)}
          onSubmit={onEdit}
        />
      )}
      <RenewSheet
        open={renewOpen}
        docId={doc.id}
        onClose={() => setRenewOpen(false)}
        onSubmit={onRenew}
      />
      <VersionsSheet open={versionsOpen} doc={doc} onClose={() => setVersionsOpen(false)} />
    </div>
  );
}

function DataRow({
  icon: Icon,
  value,
}: {
  icon: typeof Calendar;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-boat-700">
      <Icon size={15} className="shrink-0 text-boat-400" />
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
