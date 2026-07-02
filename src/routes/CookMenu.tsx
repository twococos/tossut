import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { TileButton } from '@/components/ui/common';
import { cookModeIcon } from '@/components/ui/icons';
import { CookRecipe } from '@/features/cook/CookRecipe';
import { QuickConsume } from '@/features/cook/QuickConsume';
import { useObjects } from '@/hooks/useData';
import { COOK_CATEGORIES, filterByCategories } from '@/features/cook/foodFilters';
import { normalizeText } from '@/lib/format';
import { t } from '@/text';

type Mode = 'menu' | 'recipe' | 'drink' | 'snacks' | 'dessert' | 'breakfast' | 'all';

/** Menú CUINAR amb les opcions principals. PLA.md secció 12.2. */
export function CookMenu() {
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const [mode, setMode] = useState<Mode>('menu');

  const back = () => setMode('menu');
  const done = () => navigate('/');

  if (mode === 'menu') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-xl font-bold">{t.cook.whatToCook}</h1>
        <div className="grid grid-cols-2 gap-3">
          <TileButton icon={cookModeIcon('recipe')} label={t.cook.recipe} onClick={() => setMode('recipe')} className="bg-boat-700 text-white" />
          <TileButton icon={cookModeIcon('drink')} label={t.cook.drink} onClick={() => setMode('drink')} className="bg-white text-boat-900" />
          <TileButton icon={cookModeIcon('snacks')} label={t.cook.snacks} onClick={() => setMode('snacks')} className="bg-white text-boat-900" />
          <TileButton icon={cookModeIcon('dessert')} label={t.cook.dessert} onClick={() => setMode('dessert')} className="bg-white text-boat-900" />
          <TileButton icon={cookModeIcon('breakfast')} label={t.cook.breakfast} onClick={() => setMode('breakfast')} className="bg-white text-boat-900" />
          <TileButton icon={cookModeIcon('all')} label={t.cook.all} onClick={() => setMode('all')} className="bg-boat-100 text-boat-900" />
        </div>
      </div>
    );
  }

  const titles = t.cook.titles;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <button onClick={back} className="self-start text-sm text-boat-600">
        {t.cook.back}
      </button>
      <h1 className="text-xl font-bold">{titles[mode]}</h1>

      {mode === 'recipe' ? (
        <CookRecipe onDone={done} />
      ) : mode === 'all' ? (
        <AllObjectsConsume objects={objects} onDone={done} />
      ) : (
        <QuickConsume
          title={titles[mode] ?? ''}
          objects={filterByCategories(objects, COOK_CATEGORIES[mode]!)}
          onDone={done}
        />
      )}
    </div>
  );
}

/** Llista completa amb cerca + filtre per a l'opció "Tot". */
function AllObjectsConsume({
  objects,
  onDone,
}: {
  objects: ItemObject[];
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => objects.filter((o) => normalizeText(o.name).includes(normalizeText(query))),
    [objects, query],
  );
  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.cook.searchObject}
        className="rounded-xl border border-boat-100 px-4 py-3"
      />
      <QuickConsume title={t.cook.titles.all ?? ''} objects={filtered} onDone={onDone} />
    </div>
  );
}
