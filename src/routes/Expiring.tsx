import { useState } from 'react';
import type { ItemObject } from '@/types/entities';
import { useExpiring } from '@/hooks/useDerived';
import { EmptyState, Card } from '@/components/ui/common';
import { Sheet } from '@/components/ui/Sheet';
import { Salad } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { ObjectDetail } from '@/features/objects/ObjectDetail';
import { formatQuantity } from '@/lib/format';
import { t } from '@/text';

/** Llista d'objectes que caduquen aviat (per lots). PLA.md secció 8.3 / 12.1. */
export function Expiring() {
  const expiring = useExpiring(30);
  const [detail, setDetail] = useState<ItemObject | null>(null);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.expiring.title}</h1>
      {expiring.length === 0 ? (
        <EmptyState icon={Salad} text={t.expiring.empty} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {expiring.map((e) => (
            <li key={e.object.id}>
              <button onClick={() => setDetail(e.object)} className="h-full w-full text-left active:scale-[0.98]">
                <Card className="flex h-full items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center">
                      <ObjectIcon icon={e.object.icon} size={24} />
                    </span>
                    <span>
                      <span className="block font-semibold">{e.object.name}</span>
                      <span className="block text-xs text-boat-500">
                        {t.expiring.inStock(formatQuantity(e.entry.quantity, e.object.quantityType))}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      e.daysLeft <= 1 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {e.daysLeft <= 0 ? t.expiring.expired : t.expiring.daysLeft(e.daysLeft)}
                  </span>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && <ObjectDetail object={detail} onNavigate={() => setDetail(null)} />}
      </Sheet>
    </div>
  );
}
