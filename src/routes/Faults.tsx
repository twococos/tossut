import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useFaults } from '@/hooks/useData';
import { EmptyState } from '@/components/ui/common';
import { Button } from '@/components/ui/Button';
import {
  AlertTriangle,
  History as HistoryIcon,
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from '@/components/ui/icons';
import { FaultCard } from '@/features/faults/FaultCard';
import { ReportFaultSheet } from '@/features/faults/ReportFaultSheet';
import {
  activeFaults,
  allTags,
  SEVERITIES,
  SEVERITY_DOT,
  SEVERITY_WEIGHT,
  type DerivedFault,
} from '@/domain/faults/deriveFaults';
import type { FaultSeverity } from '@/types/events';
import {
  commitFaultReport,
  commitFaultUpdate,
  commitFaultResolve,
  commitFaultEdit,
  commitFaultTags,
} from '@/db/commands';
import { normalizeText } from '@/lib/format';
import { t } from '@/text';

type SortMode = 'severity' | 'created' | 'updated';

/** Pàgina d'avaries: cerca + filtres + ordenació + llista d'actives + reportar + historial. */
export function Faults() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const faults = useFaults() ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // Cerca / filtres / ordenació.
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortMode>('severity');
  const [filterSeverity, setFilterSeverity] = useState<Set<FaultSeverity>>(new Set());
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const map = useMemo(() => new Map(faults.map((f) => [f.id, f])), [faults]);
  const active = useMemo(() => activeFaults(map), [map]);
  const tagCatalog = useMemo(() => allTags(map), [map]);

  const hasFilters =
    filterSeverity.size > 0 || filterTags.size > 0 || dateFrom !== '' || dateTo !== '';

  const listed = useMemo(() => {
    const q = normalizeText(query.trim());
    let rows = active;

    // Cerca lliure sobre títol, descripció, gravetat (etiqueta) i etiquetes.
    if (q) {
      rows = rows.filter((f) => {
        const haystack = [
          f.title,
          f.description,
          t.faults.severity[f.severity] ?? '',
          ...f.tags,
        ]
          .map((s) => normalizeText(s))
          .join(' ');
        return haystack.includes(q);
      });
    }

    // Filtre per gravetat.
    if (filterSeverity.size > 0) {
      rows = rows.filter((f) => filterSeverity.has(f.severity));
    }

    // Filtre per etiquetes (l'avaria ha de tenir TOTES les etiquetes seleccionades).
    if (filterTags.size > 0) {
      const wanted = [...filterTags].map((tg) => normalizeText(tg));
      rows = rows.filter((f) => {
        const own = new Set(f.tags.map((tg) => normalizeText(tg)));
        return wanted.every((w) => own.has(w));
      });
    }

    // Filtre per data de creació (reportedAt) entre from/to (inclusius, per dia).
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00').getTime();
      rows = rows.filter((f) => new Date(f.reportedAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59.999').getTime();
      rows = rows.filter((f) => new Date(f.reportedAt).getTime() <= to);
    }

    return sortFaults(rows, sort);
  }, [active, query, filterSeverity, filterTags, dateFrom, dateTo, sort]);

  function toggleSeverity(s: FaultSeverity) {
    setFilterSeverity((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }
  function toggleTagFilter(tag: string) {
    setFilterTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }
  function clearFilters() {
    setFilterSeverity(new Set());
    setFilterTags(new Set());
    setDateFrom('');
    setDateTo('');
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.faults.title}</h1>
        <Button onClick={() => setReportOpen(true)} className="!w-auto shrink-0 px-4">
          <span className="inline-flex items-center gap-2">
            <Plus size={18} />
            {t.faults.report}
          </span>
        </Button>
      </div>

      {/* Barra de cerca + accions de filtre/ordenació. */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boat-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.faults.searchPlaceholder}
            className="w-full rounded-xl border border-boat-100 py-2.5 pl-10 pr-3"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium active:scale-95 ${
              hasFilters
                ? 'border-boat-900 bg-boat-900 text-white'
                : 'border-boat-200 text-boat-600'
            }`}
          >
            <SlidersHorizontal size={16} />
            {t.faults.filters}
          </button>

          <label className="ml-auto inline-flex items-center gap-1.5 text-sm text-boat-600">
            <ArrowUpDown size={16} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-xl border border-boat-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="severity">{t.faults.sort.severity}</option>
              <option value="created">{t.faults.sort.created}</option>
              <option value="updated">{t.faults.sort.updated}</option>
            </select>
          </label>
        </div>

        {showFilters && (
          <div className="flex flex-col gap-3 rounded-xl border border-boat-100 bg-boat-50 p-3">
            {/* Gravetat. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
                {t.faults.filterBySeverity}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSeverity(s)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      filterSeverity.has(s)
                        ? `${SEVERITY_DOT[s]} ring-2 ring-boat-900 ring-offset-1`
                        : 'bg-white text-boat-600'
                    }`}
                  >
                    {t.faults.severity[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Etiquetes. */}
            {tagCatalog.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
                  {t.faults.filterByTags}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tagCatalog.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagFilter(tag)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium active:scale-95 ${
                        filterTags.has(tag)
                          ? 'bg-boat-900 text-white'
                          : 'bg-white text-boat-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data de creació. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
                {t.faults.filterByDate}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-boat-500">
                  {t.faults.dateFrom}
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-boat-200 px-2 py-1.5 text-sm text-boat-800"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-boat-500">
                  {t.faults.dateTo}
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl border border-boat-200 px-2 py-1.5 text-sm text-boat-800"
                  />
                </label>
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-sm font-medium text-boat-600 underline"
              >
                {t.faults.clearFilters}
              </button>
            )}
          </div>
        )}
      </div>

      {active.length === 0 ? (
        <EmptyState icon={AlertTriangle} text={t.faults.empty} />
      ) : listed.length === 0 ? (
        <EmptyState icon={Search} text={t.faults.noResults} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 lg:items-start">
          {listed.map((f) => (
            <li key={f.id}>
              <FaultCard
                fault={f}
                expanded={expandedId === f.id}
                onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
                onAddUpdate={(payload) =>
                  userName ? commitFaultUpdate(userName, f.id, payload) : undefined
                }
                onResolve={() => {
                  if (userName) commitFaultResolve(userName, f.id);
                  setExpandedId(null);
                }}
                onEdit={(data) =>
                  userName ? commitFaultEdit(userName, f.id, data) : undefined
                }
                onSetTags={(tags) =>
                  userName ? commitFaultTags(userName, f.id, tags) : undefined
                }
                allTags={tagCatalog}
              />
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={() => navigate('/faults/history')}>
        <span className="inline-flex items-center justify-center gap-2">
          <HistoryIcon size={18} />
          {t.faults.viewHistory}
        </span>
      </Button>

      <ReportFaultSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={(data) => {
          if (userName) void commitFaultReport(userName, data);
          setReportOpen(false);
        }}
      />
    </div>
  );
}

/** Ordena una llista d'avaries segons el mode triat (còpia, no muta l'entrada). */
function sortFaults(rows: DerivedFault[], sort: SortMode): DerivedFault[] {
  const byDesc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);
  const copy = [...rows];
  switch (sort) {
    case 'severity':
      return copy.sort((a, b) => {
        const w = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        return w !== 0 ? w : byDesc(a.reportedAt, b.reportedAt);
      });
    case 'created':
      return copy.sort((a, b) => byDesc(a.reportedAt, b.reportedAt));
    case 'updated':
      return copy.sort((a, b) => byDesc(a.lastActivityAt, b.lastActivityAt));
  }
}
