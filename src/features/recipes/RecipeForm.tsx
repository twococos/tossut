import { useMemo, useState } from 'react';
import type { ItemObject, Recipe, RecipeIngredient } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { ObjectForm } from '@/features/objects/ObjectForm';
import { X, Flame } from '@/components/ui/icons';
import { useObjects, useObjectsMap } from '@/hooks/useData';
import { getDefaultDiners } from '@/auth/session';
import { normalizeText } from '@/lib/format';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/** Editor de receptes: títol, ingredients per persona, temps, foc, passos. PLA.md 12.5. */
export function RecipeForm({
  initial,
  onSave,
  onCreateObject,
  onCancel,
}: {
  initial?: Recipe;
  onSave: (r: Recipe) => void;
  /** Desa un objecte nou creat des de dins la recepta (commitObjectUpsert al pare). */
  onCreateObject: (obj: ItemObject) => Promise<void>;
  onCancel: () => void;
}) {
  const objects = useObjects() ?? [];
  const objectsMap = useObjectsMap();
  const [title, setTitle] = useState(initial?.title ?? '');
  // Nombre de persones per a les quals s'introdueixen les quantitats. Per defecte, els
  // comensals d'Ajustos. L'estat dels ingredients es guarda SEMPRE per persona; els inputs
  // mostren `quantityPerPerson * servings` i, en editar, desen el valor dividit per `servings`.
  const [servings, setServings] = useState(getDefaultDiners());
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients ?? [],
  );
  const [prepTime, setPrepTime] = useState(initial?.prepTimeMinutes ?? 0);
  const [needsCooking, setNeedsCooking] = useState(initial?.needsCooking ?? false);
  const [stepsText, setStepsText] = useState((initial?.steps ?? []).join('\n'));

  // Sub-Sheet de cerca/selecció d'ingredient i sub-Sheet de nou objecte.
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [creatingObject, setCreatingObject] = useState(false);

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  // Objectes que encara NO són a la recepta (evita duplicats), filtrats per la cerca.
  const usedIds = useMemo(() => new Set(ingredients.map((i) => i.objectId)), [ingredients]);
  const candidates = useMemo(
    () =>
      objects.filter(
        (o) =>
          !usedIds.has(o.id) && normalizeText(o.name).includes(normalizeText(query)),
      ),
    [objects, usedIds, query],
  );

  function openPicker() {
    setQuery('');
    setPicking(true);
  }

  function addIngredient(objectId: string) {
    if (usedIds.has(objectId)) return;
    setIngredients((p) => [...p, { objectId, quantityPerPerson: 1 }]);
    setPicking(false);
  }

  async function createObject(obj: ItemObject) {
    await onCreateObject(obj);
    // El nou objecte s'afegeix automàticament com a ingredient de la recepta.
    setIngredients((p) =>
      p.some((i) => i.objectId === obj.id)
        ? p
        : [...p, { objectId: obj.id, quantityPerPerson: 1 }],
    );
    setCreatingObject(false);
    setPicking(false);
  }

  function submit() {
    if (!title.trim()) return;
    const now = nowISO();
    const recipe: Recipe = {
      id: initial?.id ?? newId(),
      title: title.trim(),
      ingredients: ingredients.filter((i) => i.quantityPerPerson > 0),
      prepTimeMinutes: prepTime > 0 ? prepTime : undefined,
      needsCooking,
      steps: stepsText.trim()
        ? stepsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(recipe);
  }

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder={t.recipeForm.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />

      <label className="flex items-center gap-2 text-sm font-medium text-boat-700">
        <span>{t.recipeForm.ingredientsForPeoplePrefix}</span>
        <input
          type="number"
          min={1}
          className="w-16 rounded-xl border border-boat-100 px-2 py-2 text-center"
          value={servings}
          onChange={(e) => setServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
        <span>{t.recipeForm.ingredientsForPeopleSuffix}</span>
      </label>
      {ingredients.map((ing, idx) => {
        const obj = objectsMap.get(ing.objectId);
        // El pes va en grams a receptes (kg → g); el desat segueix sent per persona en kg.
        const isWeight = obj?.quantityType === 'kg';
        const factor = isWeight ? 1000 : 1;
        const unit = isWeight ? 'g' : obj?.quantityType === 'L' ? 'L' : '';
        const shown = Math.round(ing.quantityPerPerson * servings * factor * 1000) / 1000;
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="flex flex-1 items-center gap-2 rounded-xl border border-boat-100 px-3 py-2">
              <ObjectIcon icon={obj?.icon} size={20} />
              <span className="truncate">{obj?.name ?? ''}</span>
            </span>
            <input
              type="number"
              step="0.01"
              className="w-20 rounded-xl border border-boat-100 px-2 py-2"
              value={shown}
              onChange={(e) => {
                const entered = parseFloat(e.target.value) || 0;
                const perPerson = entered / factor / servings;
                setIngredients((p) =>
                  p.map((x, i) => (i === idx ? { ...x, quantityPerPerson: perPerson } : x)),
                );
              }}
            />
            {unit && <span className="w-4 text-sm text-boat-500">{unit}</span>}
            <button
              type="button"
              onClick={() => setIngredients((p) => p.filter((_, i) => i !== idx))}
              aria-label={t.recipeForm.removeIngredientAria}
              className="text-red-500"
            >
              <X size={20} />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={openPicker} className="self-start text-sm text-boat-600">
        {t.recipeForm.addIngredient}
      </button>

      <label className="text-sm font-medium text-boat-700">{t.recipeForm.prepTime}</label>
      <input
        type="number"
        className={field}
        value={prepTime}
        onChange={(e) => setPrepTime(parseInt(e.target.value, 10) || 0)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={needsCooking} onChange={(e) => setNeedsCooking(e.target.checked)} />
        <span className="flex items-center gap-1">
          {t.recipeForm.needsCooking} <Flame size={16} className="text-red-500" />
        </span>
      </label>

      <label className="text-sm font-medium text-boat-700">{t.recipeForm.steps}</label>
      <textarea
        className={field}
        rows={4}
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
      />

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>{t.common.cancel}</Button>
        <Button onClick={submit}>{t.common.save}</Button>
      </div>

      {/* Sub-Sheet: cerca i selecció d'ingredient. Si no hi ha coincidències, "Nou ingredient". */}
      <Sheet open={picking} onClose={() => setPicking(false)} title={t.recipeForm.pickIngredientTitle}>
        <div className="flex flex-col gap-3">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.recipeForm.searchIngredientPlaceholder}
            className={field}
          />
          {candidates.length === 0 ? (
            <button
              type="button"
              onClick={() => setCreatingObject(true)}
              className="self-start text-sm font-medium text-boat-700"
            >
              {t.recipeForm.newIngredient}
            </button>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => addIngredient(o.id)}
                    className="flex w-full items-center gap-2 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                  >
                    <ObjectIcon icon={o.icon} size={24} />
                    <span className="text-left font-semibold">{o.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>

      {/* Sub-Sheet: nou objecte. Es renderitza dins el RecipeForm perquè no es perdi
          el progrés de la recepta. En desar, s'afegeix com a ingredient. */}
      <Sheet open={creatingObject} onClose={() => setCreatingObject(false)} title={t.recipeForm.newObjectTitle}>
        <ObjectForm
          initialName={query}
          onSave={createObject}
          onCancel={() => setCreatingObject(false)}
        />
      </Sheet>
    </div>
  );
}
