import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { Package } from '@/components/ui/icons';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { ObjectForm } from '@/features/objects/ObjectForm';
import { ObjectDetail } from '@/features/objects/ObjectDetail';
import { useObjects, useInventoryMap } from '@/hooks/useData';
import { commitObjectUpsert, commitObjectDelete } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { useEditLocked } from '@/hooks/useEditLocked';
import { useObjectSort } from '@/hooks/useObjectSort';
import type { ObjectSort } from '@/auth/session';
import type { StockType } from '@/types/entities';
import { formatQuantity, normalizeText } from '@/lib/format';
import { t } from '@/text';

/** Ordre fix de les categories per a l'ordenació "per categoria". */
const STOCK_TYPE_ORDER: Record<StockType, number> = {
  food: 0,
  consumable: 1,
  tools: 2,
  other: 3,
};

/** Catàleg d'objectes amb cerca i creació/edició. PLA.md secció 12.5. */
export function ObjectsList() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const invMap = useInventoryMap();
  const editLocked = useEditLocked();
  const [sort, setSort] = useObjectSort();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ItemObject | null>(null);
  const [editing, setEditing] = useState<ItemObject | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const matched = objects.filter((o) => normalizeText(o.name).includes(q));
    const byName = (a: ItemObject, b: ItemObject) =>
      normalizeText(a.name).localeCompare(normalizeText(b.name));
    return [...matched].sort((a, b) => {
      switch (sort) {
        case 'category': {
          const c = STOCK_TYPE_ORDER[a.stockType] - STOCK_TYPE_ORDER[b.stockType];
          if (c !== 0) return c;
          const sc = (a.foodCategory ?? '').localeCompare(b.foodCategory ?? '');
          return sc !== 0 ? sc : byName(a, b);
        }
        case 'recent':
          return b.createdAt.localeCompare(a.createdAt);
        case 'stock': {
          const qa = invMap.get(a.id)?.quantity ?? 0;
          const qb = invMap.get(b.id)?.quantity ?? 0;
          return qb - qa || byName(a, b);
        }
        default:
          return byName(a, b);
      }
    });
  }, [objects, query, sort, invMap]);

  async function save(obj: ItemObject) {
    if (!userName) return;
    await commitObjectUpsert(userName, obj);
    setEditing(null);
    setCreating(false);
  }

  async function remove(id: string) {
    if (!userName) return;
    await commitObjectDelete(userName, id);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.objects.title}</h1>
        <button
          onClick={() => navigate('/objects/recipes')}
          className="text-sm text-boat-600"
        >
          {t.objects.toRecipes}
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.common.search}
        className="rounded-xl border border-boat-100 px-4 py-3"
      />

      <label className="flex items-center gap-2 text-sm text-boat-600">
        <span className="shrink-0">{t.objects.sortLabel}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ObjectSort)}
          className="flex-1 rounded-xl border border-boat-100 px-3 py-2"
        >
          <option value="alpha">{t.objects.sortOptions.alpha}</option>
          <option value="category">{t.objects.sortOptions.category}</option>
          <option value="recent">{t.objects.sortOptions.recent}</option>
          <option value="stock">{t.objects.sortOptions.stock}</option>
        </select>
      </label>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} text={t.objects.empty} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => setDetail(o)}
                className="flex h-full w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center">
                    <ObjectIcon icon={o.icon} size={24} />
                  </span>
                  <span className="text-left">
                    <span className="block font-semibold">{o.name}</span>
                    <span className="block text-xs text-boat-500">
                      {t.object.stockType[o.stockType]}
                      {o.foodCategory
                        ? ` · ${t.object.foodCategory[o.foodCategory] ?? o.foodCategory}`
                        : ''}
                    </span>
                  </span>
                </span>
                <span className="text-sm text-boat-500">
                  {formatQuantity(invMap.get(o.id)?.quantity ?? 0, o.quantityType)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!editLocked && <Button onClick={() => setCreating(true)}>{t.objects.newObject}</Button>}

      {/* Detall de l'objecte */}
      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <ObjectDetail
            object={detail}
            onNavigate={() => setDetail(null)}
            onEdit={
              editLocked
                ? undefined
                : () => {
                    setEditing(detail);
                    setDetail(null);
                  }
            }
          />
        )}
      </Sheet>

      <Sheet open={creating} onClose={() => setCreating(false)} title={t.objects.newObjectTitle}>
        <ObjectForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t.objects.editObjectTitle}>
        {editing && (
          <div className="flex flex-col gap-4">
            <ObjectForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
            <ConfirmDelete
              message={t.objects.confirmDelete(editing.name)}
              onConfirm={() => remove(editing.id)}
            />
          </div>
        )}
      </Sheet>
    </div>
  );
}
