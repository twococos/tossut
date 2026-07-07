import { useMemo, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Check, Plus } from '@/components/ui/icons';
import { normalizeText } from '@/lib/format';
import { normalizeTag } from '@/domain/faults/deriveFaults';
import { t } from '@/text';

/**
 * Selector d'etiquetes d'una avaria amb cercador. Mateix patró que el sub-Sheet de cerca
 * d'ingredient del RecipeForm: llista el catàleg filtrat, marca les ja seleccionades (toggle),
 * i si el text escrit no coincideix amb cap etiqueta existent ofereix crear-la.
 *
 * Cada toggle/creació crida el pare (que reescriu la llista sencera via commitFaultTags). El
 * full pot quedar obert per fer diversos canvis seguits; `selected` ve de la cau reactiva.
 */
export function TagPickerSheet({
  open,
  onClose,
  selected,
  allTags,
  onToggle,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  allTags: string[];
  onToggle: (tag: string) => void;
  onCreate: (tag: string) => void;
}) {
  const [query, setQuery] = useState('');

  const selectedKeys = useMemo(
    () => new Set(selected.map((s) => normalizeText(s))),
    [selected],
  );

  const normalizedQuery = normalizeText(query);
  const candidates = useMemo(
    () => allTags.filter((tag) => normalizeText(tag).includes(normalizedQuery)),
    [allTags, normalizedQuery],
  );

  // Es pot crear si el text net no és buit i no coincideix EXACTAMENT amb cap etiqueta existent.
  const trimmed = normalizeTag(query);
  const canCreate =
    trimmed.length > 0 &&
    !allTags.some((tag) => normalizeText(tag) === normalizeText(trimmed));

  return (
    <Sheet open={open} onClose={onClose} title={t.faults.tagPickerTitle}>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.faults.searchTagPlaceholder}
          className="w-full rounded-xl border border-boat-100 px-4 py-3"
        />

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              onCreate(trimmed);
              setQuery('');
            }}
            className="flex items-center gap-2 self-start rounded-xl bg-boat-100 px-3 py-2 text-sm font-semibold text-boat-900 active:scale-95"
          >
            <Plus size={16} />
            {t.faults.createTag(trimmed)}
          </button>
        )}

        {candidates.length > 0 && (
          <ul className="flex flex-col gap-2">
            {candidates.map((tag) => {
              const isSel = selectedKeys.has(normalizeText(tag));
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => onToggle(tag)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl p-3 shadow-sm active:scale-[0.98] ${
                      isSel ? 'bg-boat-900 text-white' : 'bg-white'
                    }`}
                  >
                    <span className="truncate text-left font-semibold">{tag}</span>
                    {isSel && <Check size={18} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
