import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState, Card } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { ShoppingCart, Trash2, ScrollText, CheckCircle } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { useObjects, useObjectsMap, useShoppingItems } from '@/hooks/useData';
import {
  shoppingItems,
  type DerivedShoppingItem,
} from '@/domain/shopping/deriveShoppingList';
import {
  commitShoppingAdd,
  commitShoppingRemove,
  commitShoppingBought,
  commitShoppingClear,
} from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { formatQuantity, normalizeText } from '@/lib/format';
import { t } from '@/text';

/**
 * Llista de la compra: anotar petites coses oblidades que cal comprar en trobar un
 * supermercat. A dalt una cerca per afegir objectes del catàleg (Sheet distint del de
 * compra: afegeix a la LLISTA, no a l'estoc); a sota la llista actual (sincronitzada per
 * deltes). "Comprat!" treu de la llista i suma a l'estoc. Veure CONTEXT.md.
 */
export function ShoppingList() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const objectsMap = useObjectsMap();
  const items = useShoppingItems() ?? [];

  const [query, setQuery] = useState('');
  // Objecte seleccionat al cercador per al Sheet d'afegir, i quantitat a afegir.
  const [obj, setObj] = useState<ItemObject | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      query.trim()
        ? objects.filter((o) => normalizeText(o.name).includes(normalizeText(query)))
        : [],
    [objects, query],
  );

  // Ítems actuals (ordenats per data d'afegit, els més recents a dalt).
  const list = useMemo(
    () => shoppingItems(new Map(items.map((i) => [i.objectId, i]))),
    [items],
  );

  async function addToList() {
    if (!obj || !userName) return;
    await commitShoppingAdd(userName, obj.id, addQty);
    setObj(null);
    setQuery('');
  }

  function openAdd(o: ItemObject) {
    setObj(o);
    setAddQty(o.quantityType === 'units' ? 1 : 1);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.shopping.title}</h1>

      {/* Cerca per afegir objectes a la llista. */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.shopping.searchPlaceholder}
        className="rounded-xl border border-boat-100 px-4 py-3"
      />

      {query.trim() &&
        (filtered.length === 0 ? (
          <EmptyState text={t.shopping.noResults} />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => openAdd(o)}
                  className="flex w-full items-center gap-2 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                >
                  <span className="flex h-8 w-8 items-center justify-center">
                    <ObjectIcon icon={o.icon} size={24} />
                  </span>
                  <span className="font-semibold">{o.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {/* Llista actual. */}
      {!query.trim() &&
        (list.length === 0 ? (
          <EmptyState icon={ShoppingCart} text={t.shopping.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((item) => {
              const object = objectsMap.get(item.objectId);
              if (!object) return null;
              return (
                <li key={item.objectId}>
                  <ShoppingItemCard
                    item={item}
                    object={object}
                    expanded={expandedId === item.objectId}
                    onToggle={() =>
                      setExpandedId(
                        expandedId === item.objectId ? null : item.objectId,
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        ))}

      {/* Accions inferiors: buidar + historial. Separades de la llista per un espai gran
          (≈ 2 items) perquè no es premin per error en arrossegar la llista. */}
      {!query.trim() && (
        <div className={`flex flex-col gap-3 ${list.length > 0 ? 'mt-32' : ''}`}>
          {list.length > 0 && (
            <ConfirmAction
              label={t.shopping.clearAll}
              message={t.shopping.clearConfirm}
              confirmLabel={t.shopping.clearAll}
              icon={Trash2}
              variant="danger"
              onConfirm={() => (userName ? commitShoppingClear(userName) : undefined)}
            />
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/shopping/history')}
            className="flex items-center justify-center gap-2"
          >
            <ScrollText size={18} />
            {t.shopping.history}
          </Button>
        </div>
      )}

      {/* Sheet d'afegir a la llista (DISTINT del d'afegir a l'estoc: carret + text de llista). */}
      <Sheet
        open={!!obj}
        onClose={() => setObj(null)}
        title={obj ? t.shopping.addToListTitle(obj.name) : ''}
      >
        {obj && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-boat-100 px-4 py-1.5 text-sm font-semibold text-boat-700">
              <ShoppingCart size={18} />
              {t.shopping.addToList}
            </div>
            <NumberStepper
              value={addQty}
              onChange={setAddQty}
              min={obj.quantityType === 'units' ? 1 : 0.1}
              step={obj.quantityType === 'units' ? 1 : 0.1}
            />
            <Button
              onClick={() => void addToList()}
              className="flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              {t.shopping.addToList}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/**
 * Targeta d'un ítem de la llista. En clicar s'expandeix: editar unitats (NumberStepper que
 * emet un delta), "Eliminar" (treu de la llista) i "Comprat!" (treu i suma a l'estoc; demana
 * caducitat si l'objecte ho requereix).
 */
function ShoppingItemCard({
  item,
  object,
  expanded,
  onToggle,
}: {
  item: DerivedShoppingItem;
  object: ItemObject;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { userName } = useAuth();
  const needsExpiry = object.expiry?.mode === 'define_on_add';
  const [boughtOpen, setBoughtOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  async function setQuantity(next: number) {
    if (!userName) return;
    const delta = next - item.quantity;
    if (delta !== 0) await commitShoppingAdd(userName, object.id, delta);
  }

  async function remove() {
    if (!userName) return;
    await commitShoppingRemove(userName, object.id);
  }

  async function confirmBought() {
    if (!userName) return;
    await commitShoppingBought(
      userName,
      object.id,
      item.quantity,
      expiresAt || undefined,
    );
    setBoughtOpen(false);
    setExpiresAt('');
  }

  async function onBought() {
    if (needsExpiry) {
      setBoughtOpen(true);
    } else {
      await confirmBought();
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            <ObjectIcon icon={object.icon} size={24} />
          </span>
          <span className="truncate font-semibold">{object.name}</span>
        </button>
        {expanded ? (
          // En expandir, el stepper substitueix el nombre d'unitats a la dreta del títol.
          <NumberStepper
            value={item.quantity}
            onChange={(v) => void setQuantity(v)}
            min={object.quantityType === 'units' ? 1 : 0.1}
            step={object.quantityType === 'units' ? 1 : 0.1}
            size="sm"
          />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="text-boat-600 tabular-nums"
          >
            {formatQuantity(item.quantity, object.quantityType)}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 flex w-full gap-2">
          <Button
            variant="danger"
            onClick={() => void remove()}
            className="flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            {t.shopping.remove}
          </Button>
          <Button
            onClick={() => void onBought()}
            className="flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            {t.shopping.bought}
          </Button>
        </div>
      )}

      {/* Sheet de caducitat per a "Comprat!" (només si l'objecte la demana a l'afegir). */}
      <Sheet
        open={boughtOpen}
        onClose={() => setBoughtOpen(false)}
        title={object.name}
      >
        <div className="flex flex-col items-center gap-4">
          <label className="flex w-full flex-col gap-1 text-sm">
            {t.shopping.expiryDate}
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-xl border border-boat-100 px-4 py-3"
            />
          </label>
          <Button
            onClick={() => void confirmBought()}
            className="flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            {t.shopping.bought}
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
