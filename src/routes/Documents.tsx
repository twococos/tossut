import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useDocuments } from '@/hooks/useData';
import { useDocExpiryWarning } from '@/hooks/useDocExpiryWarning';
import { EmptyState, Card } from '@/components/ui/common';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  FolderOpen,
  History as HistoryIcon,
  Plus,
} from '@/components/ui/icons';
import { DocumentCard } from '@/features/documents/DocumentCard';
import { DocumentFormSheet, type DocumentFormValue } from '@/features/documents/DocumentFormSheet';
import {
  activeDocuments,
  documentsByCategory,
  byExpiryThenTitle,
  daysUntilExpiry,
  type DerivedDocument,
} from '@/domain/documents/deriveDocuments';
import { DOC_CATEGORIES, type DocCategory } from '@/types/entities';
import { commitDocumentCreate } from '@/db/commands';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

type SortMode = 'expiry' | 'title' | 'category';

/** Pàgina de documentació tècnica: carpetes per categoria + cerca/ordenació + crear. */
export function Documents() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const documents = useDocuments() ?? [];
  const warningDays = useDocExpiryWarning();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('expiry');
  const [openCategory, setOpenCategory] = useState<DocCategory | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const map = useMemo(
    () => new Map(documents.map((d) => [d.id, d])),
    [documents],
  );
  const active = useMemo(() => activeDocuments(map), [map]);
  const byCategory = useMemo(() => documentsByCategory(map), [map]);

  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;

  // Resultats plans quan hi ha cerca o quan s'ha entrat a una categoria.
  const listed = useMemo(() => {
    let rows: DerivedDocument[];
    if (searching) {
      rows = active.filter(
        (d) =>
          d.title.toLowerCase().includes(trimmedQuery) ||
          d.description.toLowerCase().includes(trimmedQuery) ||
          (d.current.reference ?? '').toLowerCase().includes(trimmedQuery) ||
          (d.current.issuer ?? '').toLowerCase().includes(trimmedQuery),
      );
    } else if (openCategory) {
      rows = byCategory.get(openCategory) ?? [];
    } else {
      return [];
    }
    return sortDocs(rows, sort);
  }, [searching, openCategory, active, byCategory, trimmedQuery, sort]);

  const showFolders = !searching && !openCategory;

  function onCreate(value: DocumentFormValue) {
    if (userName) void commitDocumentCreate(userName, value);
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.documents.title}</h1>
        <Button onClick={() => setCreateOpen(true)} className="!w-auto shrink-0 px-4">
          <span className="inline-flex items-center gap-2">
            <Plus size={18} />
            {t.documents.newDocument}
          </span>
        </Button>
      </div>

      {/* Cerca + ordenació. */}
      <div className="flex flex-col gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.common.search}
          className="rounded-xl border border-boat-100 px-4 py-3"
        />
        {!showFolders && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-boat-500">{t.documents.sortLabel}:</span>
            <div className="flex gap-1.5">
              {(['expiry', 'title', 'category'] as SortMode[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold active:scale-95 ${
                    sort === s ? 'bg-boat-700 text-white' : 'bg-boat-100 text-boat-700'
                  }`}
                >
                  {t.documents.sort[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {active.length === 0 && !searching ? (
        <EmptyState icon={FileText} text={t.documents.empty} />
      ) : showFolders ? (
        // Vista de carpetes per categoria.
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {DOC_CATEGORIES.filter((c) => (byCategory.get(c)?.length ?? 0) > 0).map((c) => {
            const docs = byCategory.get(c) ?? [];
            const now = nowISO();
            const expiring = docs.filter((d) => {
              const days = daysUntilExpiry(d, now);
              return days !== null && days <= warningDays;
            }).length;
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenCategory(c);
                    setExpandedId(null);
                  }}
                  className="flex h-full w-full flex-col gap-1 rounded-2xl bg-white p-4 text-left shadow-sm active:scale-95"
                >
                  <FolderOpen size={24} className="text-boat-500" />
                  <span className="font-semibold leading-tight">{t.documents.category[c]}</span>
                  <span className="text-xs text-boat-500">{t.documents.docCount(docs.length)}</span>
                  {expiring > 0 && (
                    <span className="mt-1 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {t.documents.expiringBadge(expiring)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        // Llista plana (categoria oberta o cerca activa).
        <div className="flex flex-col gap-3">
          {!searching && openCategory && (
            <button
              type="button"
              onClick={() => setOpenCategory(null)}
              className="w-fit text-sm font-medium text-boat-500 active:scale-95"
            >
              {t.documents.backToCategories}
            </button>
          )}
          {!searching && openCategory && (
            <Card className="bg-boat-50 py-2 text-sm font-semibold text-boat-700">
              {t.documents.category[openCategory]}
            </Card>
          )}
          {listed.length === 0 ? (
            <EmptyState
              icon={FileText}
              text={searching ? t.documents.noResults : t.documents.emptyCategory}
            />
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2 lg:items-start">
              {listed.map((d) => (
                <li key={d.id}>
                  <DocumentCard
                    doc={d}
                    expanded={expandedId === d.id}
                    onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button variant="secondary" onClick={() => navigate('/documents/history')}>
        <span className="inline-flex items-center justify-center gap-2">
          <HistoryIcon size={18} />
          {t.documents.viewHistory}
        </span>
      </Button>

      <DocumentFormSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />
    </div>
  );
}

function sortDocs(rows: DerivedDocument[], sort: SortMode): DerivedDocument[] {
  const copy = [...rows];
  if (sort === 'title') {
    return copy.sort((a, b) => a.title.localeCompare(b.title, 'ca'));
  }
  if (sort === 'category') {
    return copy.sort((a, b) => {
      if (a.category !== b.category) {
        return DOC_CATEGORIES.indexOf(a.category) - DOC_CATEGORIES.indexOf(b.category);
      }
      return byExpiryThenTitle(a, b);
    });
  }
  return copy.sort(byExpiryThenTitle);
}
