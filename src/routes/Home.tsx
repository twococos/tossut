import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { Card, ProgressBar } from '@/components/ui/common';
import { Sheet } from '@/components/ui/Sheet';
import {
  ChefHat,
  ShoppingCart,
  ThumbsUp,
  Book,
  Gauge,
  AlertTriangle,
  FileText,
  resourceIcon,
} from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { ObjectDetail } from '@/features/objects/ObjectDetail';
import { useDurations, useExpiring, useResourceDurations } from '@/hooks/useDerived';
import { useObjects, useInventoryMap, useFaults, useDocuments } from '@/hooks/useData';
import { useDashboardPrefs } from '@/hooks/useDashboardPrefs';
import { useDocExpiryWarning } from '@/hooks/useDocExpiryWarning';
import { activeFaults, highestActiveSeverity, SEVERITY_DOT } from '@/domain/faults/deriveFaults';
import { expiringCount } from '@/domain/documents/deriveDocuments';
import { formatQuantity } from '@/lib/format';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/** Dashboard / portada: centrat en el menjar (el més usat). PLA.md secció 12.1. */
export function Home() {
  const navigate = useNavigate();
  const prefs = useDashboardPrefs();
  const durations = useDurations();
  const resourceRows = useResourceDurations();
  const expiring = useExpiring(7);
  const objects = useObjects() ?? [];
  const invMap = useInventoryMap();
  const faults = useFaults() ?? [];
  const documents = useDocuments() ?? [];
  const docWarningDays = useDocExpiryWarning();
  const [detail, setDetail] = useState<ItemObject | null>(null);
  const [waterList, setWaterList] = useState(false);

  const waterObjects = objects.filter((o) => o.foodCategory === 'water');

  const faultsMap = new Map(faults.map((f) => [f.id, f]));
  const activeFaultCount = activeFaults(faultsMap).length;
  const topSeverity = highestActiveSeverity(faultsMap);

  const docExpiringCount = expiringCount(documents, docWarningDays, nowISO());

  // Columnes de la fila de botons secundaris segons quants n'hi ha (2 fixos + opcionals).
  // Classes literals (no dinàmiques) perquè Tailwind les detecti al purgar.
  const secondaryCount =
    2 + (prefs.showFaultsButton ? 1 : 0) + (prefs.showDocumentsButton ? 1 : 0);
  const secondaryCols =
    secondaryCount === 2 ? 'grid-cols-2' : secondaryCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Botons grans principals */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/cook')}
          className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-3xl bg-boat-700 text-white shadow active:scale-95"
        >
          <ChefHat size={40} />
          <span className="text-lg font-bold">{t.home.cook}</span>
        </button>
        <button
          onClick={() => navigate('/guide')}
          className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-3xl bg-boat-500 text-white shadow active:scale-95"
        >
          <Book size={40} />
          <span className="text-lg font-bold">{t.home.guide}</span>
        </button>
      </div>

      {/* Botons petits secundaris (meitat d'alçada). Columnes segons quants botons opcionals
          (avaries, documentació) hi ha actius. */}
      <div className={`grid gap-3 ${secondaryCols}`}>
        <button
          onClick={() => navigate('/purchase')}
          className="flex min-h-touch flex-row items-center justify-center gap-2 rounded-2xl bg-boat-100 text-boat-900 shadow-sm active:scale-95"
        >
          <ShoppingCart size={24} />
          <span className="text-sm font-semibold">{t.home.buy}</span>
        </button>
        <button
          onClick={() => navigate('/measure')}
          className="flex min-h-touch flex-row items-center justify-center gap-2 rounded-2xl bg-boat-100 text-boat-900 shadow-sm active:scale-95"
        >
          <Gauge size={24} />
          <span className="text-sm font-semibold">{t.home.measure}</span>
        </button>
        {prefs.showFaultsButton && (
          <button
            onClick={() => navigate('/faults')}
            className="relative flex min-h-touch flex-row items-center justify-center gap-2 rounded-2xl bg-boat-100 text-boat-900 shadow-sm active:scale-95"
          >
            <AlertTriangle size={24} />
            <span className="text-sm font-semibold">{t.home.faults}</span>
            {activeFaultCount > 0 && topSeverity && (
              <span
                className={`absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${SEVERITY_DOT[topSeverity]}`}
              >
                {activeFaultCount}
              </span>
            )}
          </button>
        )}
        {prefs.showDocumentsButton && (
          <button
            onClick={() => navigate('/documents')}
            className="relative flex min-h-touch flex-row items-center justify-center gap-2 rounded-2xl bg-boat-100 text-boat-900 shadow-sm active:scale-95"
          >
            <FileText size={24} />
            <span className="text-sm font-semibold">{t.home.documents}</span>
            {docExpiringCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
                {docExpiringCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Indicadors de durada (aigua, gas…) */}
      {prefs.showDurationSection && durations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-boat-700">{t.home.estimatedDuration}</h2>
          {durations.map((d) => {
            const inner = (
              <Card className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center">
                    <ObjectIcon icon={d.icon} size={24} />
                  </span>
                  <span>
                    <span className="font-semibold">{d.label}</span>
                    <span className="block text-xs text-boat-500">{d.stockLabel}</span>
                  </span>
                </span>
                <span className="text-right">
                  {d.daysRemaining === null ? (
                    <span className="text-sm text-boat-400">{t.home.noConsumption}</span>
                  ) : (
                    <span className="text-lg font-bold text-boat-700">
                      ~{Math.floor(d.daysRemaining)} d
                    </span>
                  )}
                </span>
              </Card>
            );
            if (d.key === 'water') {
              return (
                <button
                  key={d.key}
                  onClick={() => setWaterList(true)}
                  className="w-full text-left active:scale-[0.98]"
                >
                  {inner}
                </button>
              );
            }
            return d.object ? (
              <button
                key={d.key}
                onClick={() => setDetail(d.object!)}
                className="w-full text-left active:scale-[0.98]"
              >
                {inner}
              </button>
            ) : (
              <div key={d.key}>{inner}</div>
            );
          })}
        </section>
      )}

      {/* Recursos continus: gasoil, aigua de tancs, gas */}
      {prefs.showResourcesSection && resourceRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-boat-700">{t.home.resourcesCard}</h2>
          <Card className="flex flex-col gap-3">
            {resourceRows.map((r) => {
              const Icon = resourceIcon(r.kind);
              return (
                <button
                  key={r.kind}
                  onClick={() => navigate(`/resources/${r.kind}`)}
                  className="flex items-center gap-3 active:scale-[0.98]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                    <Icon size={22} className="text-boat-700" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{t.resources.kind[r.kind]}</span>
                      <span className="text-sm font-bold text-boat-700">
                        {r.percent === null ? '—' : `${Math.round(r.percent)}%`}
                      </span>
                    </span>
                    <ProgressBar percent={r.percent} className="mt-1" />
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs">
                    {r.daysRemaining === null ? (
                      <span className="text-boat-400">{t.resources.noConsumption}</span>
                    ) : (
                      <span className="font-semibold text-boat-700">
                        {t.resources.daysRemaining(r.daysRemaining)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </Card>
        </section>
      )}

      {/* Caduca aviat */}
      {prefs.showExpiringSection && (
      <section className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/expiring')}
          className="flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold text-boat-700">{t.home.expiringSoon}</h2>
          <span className="text-xs text-boat-500">{t.home.seeAll}</span>
        </button>
        {expiring.length === 0 ? (
          <Card className="flex items-center gap-2 text-sm text-boat-500">
            <ThumbsUp size={18} className="text-green-600" />
            {t.home.nothingExpires7}
          </Card>
        ) : (
          expiring.slice(0, 3).map((e) => (
            <button
              key={e.object.id}
              onClick={() => setDetail(e.object)}
              className="w-full text-left active:scale-[0.98]"
            >
              <Card className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center">
                    <ObjectIcon icon={e.object.icon} size={24} />
                  </span>
                  <span className="font-semibold">{e.object.name}</span>
                </span>
                <span
                  className={`text-sm font-bold ${
                    e.daysLeft <= 1 ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {e.daysLeft <= 0 ? t.common.expiredShort : t.common.daysShort(e.daysLeft)}
                </span>
              </Card>
            </button>
          ))
        )}
      </section>
      )}

      {/* Llistat d'aigües per tipus (des de la fila "Aigua potable") */}
      <Sheet open={waterList} onClose={() => setWaterList(false)} title={t.home.drinkingWater}>
        {waterObjects.length === 0 ? (
          <p className="text-sm text-boat-400">{t.home.noWaterObjects}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {waterObjects.map((o) => {
              const qty = invMap.get(o.id)?.quantity ?? 0;
              const liters = o.capacityLiters ? qty * o.capacityLiters : null;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => {
                      setWaterList(false);
                      setDetail(o);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center">
                        <ObjectIcon icon={o.icon} size={24} />
                      </span>
                      <span className="text-left">
                        <span className="block font-semibold">{o.name}</span>
                        {o.capacityLiters ? (
                          <span className="block text-xs text-boat-500">{t.home.litersPerBottle(o.capacityLiters)}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-right text-sm text-boat-500">
                      <span className="block font-semibold text-boat-700">
                        {formatQuantity(qty, o.quantityType)}
                      </span>
                      {liters !== null && <span className="block text-xs">{Math.round(liters * 10) / 10} L</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && <ObjectDetail object={detail} onNavigate={() => setDetail(null)} />}
      </Sheet>
    </div>
  );
}
