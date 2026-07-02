import { useState } from 'react';
import type { ItemObject, Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { BookOpen, Flame } from '@/components/ui/icons';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { RecipeDetail } from '@/features/recipes/RecipeDetail';
import { useRecipes } from '@/hooks/useData';
import { commitRecipeUpsert, commitRecipeDelete, commitObjectUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { useEditLocked } from '@/hooks/useEditLocked';
import { t } from '@/text';

/** Guia de receptes amb editor. PLA.md secció 12.5. */
export function Recipes() {
  const { userName } = useAuth();
  const recipes = useRecipes() ?? [];
  const editLocked = useEditLocked();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(r: Recipe) {
    if (!userName) return;
    await commitRecipeUpsert(userName, r);
    setEditing(null);
    setCreating(false);
  }

  async function remove(id: string) {
    if (!userName) return;
    await commitRecipeDelete(userName, id);
    setEditing(null);
  }

  async function createObject(obj: ItemObject) {
    if (!userName) return;
    await commitObjectUpsert(userName, obj);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.recipes.title}</h1>

      {recipes.length === 0 ? (
        <EmptyState icon={BookOpen} text={t.recipes.empty} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {recipes.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setViewing(r)}
                className="flex h-full w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <span className="font-semibold">{r.title}</span>
                <span className="flex items-center gap-1 text-xs text-boat-500">
                  {r.needsCooking && <Flame size={14} className="text-red-500" />}
                  {t.recipes.ingredientsCount(r.ingredients.length)}
                  {r.prepTimeMinutes ? ` · ${t.recipes.prepTime(r.prepTimeMinutes)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!editLocked && <Button onClick={() => setCreating(true)}>{t.recipes.newRecipe}</Button>}

      <Sheet open={creating} onClose={() => setCreating(false)} title={t.recipes.newRecipeTitle}>
        <RecipeForm onSave={save} onCreateObject={createObject} onCancel={() => setCreating(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t.recipes.editRecipeTitle}>
        {editing && (
          <div className="flex flex-col gap-4">
            <RecipeForm initial={editing} onSave={save} onCreateObject={createObject} onCancel={() => setEditing(null)} />
            <ConfirmDelete
              message={t.recipes.confirmDelete(editing.title)}
              onConfirm={() => remove(editing.id)}
            />
          </div>
        )}
      </Sheet>
      <Sheet open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <RecipeDetail
            recipe={viewing}
            onCooked={() => setViewing(null)}
            onEdit={
              editLocked
                ? undefined
                : () => {
                    setEditing(viewing);
                    setViewing(null);
                  }
            }
          />
        )}
      </Sheet>
    </div>
  );
}
