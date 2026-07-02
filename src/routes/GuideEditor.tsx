import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GuideBlock, GuideSection } from '@/types/entities';
import { useGuideSections } from '@/hooks/useData';
import { useAuth } from '@/auth/AuthProvider';
import { commitGuideUpsert, commitGuideDelete } from '@/db/commands';
import { AddBlockMenu } from '@/features/guide/AddBlockMenu';
import { BlockEditor } from '@/features/guide/BlockEditor';
import { Button } from '@/components/ui/Button';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { IconPicker } from '@/components/ui/IconPicker';
import { Trash2 } from '@/components/ui/icons';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

/**
 * Editor de creació/edició d'una secció de la guia. Ruta `guide/new` (nova) o
 * `guide/edit/:id` (existent). Tot l'estat és local fins que es prem "Guardar": llavors
 * s'emet un `guide_upsert` (snapshot complet) via `commitGuideUpsert`. "Eliminar" emet un
 * `guide_delete`. "Cancel·lar" torna sense desar res.
 */
export function GuideEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName } = useAuth();
  const sections = useGuideSections();

  // Secció existent (si estem editant). Encara pot ser undefined mentre carrega la cau.
  const existing = useMemo(
    () => (id ? sections?.find((s) => s.id === id) : undefined),
    [id, sections],
  );

  // Id estable des del principi perquè les rutes de foto dels blocs el referenciïn.
  const idRef = useRef(existing?.id ?? id ?? newId());

  // Estat inicial: es fixa un cop tenim (o descartem) la secció existent.
  const [icon, setIcon] = useState<string>(existing?.icon ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [blocks, setBlocks] = useState<GuideBlock[]>(existing?.blocks ?? []);
  const [hydrated, setHydrated] = useState(!id); // les noves ja arrenquen "hidratades"
  const [error, setError] = useState(false);

  // En editar, quan la secció apareix a la cau per primer cop, carrega-la a l'estat.
  if (id && !hydrated && existing) {
    idRef.current = existing.id;
    setIcon(existing.icon ?? '');
    setTitle(existing.title);
    setBlocks(existing.blocks);
    setHydrated(true);
  }

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  function insertBlock(at: number, block: GuideBlock) {
    setBlocks((prev) => [...prev.slice(0, at), block, ...prev.slice(at)]);
  }
  function updateBlock(at: number, next: GuideBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === at ? next : b)));
  }
  function deleteBlock(at: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== at));
  }
  function moveBlock(at: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = at + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[at], next[target]] = [next[target]!, next[at]!];
      return next;
    });
  }

  /** Neteja els blocs abans de desar: treu ítems buits i blocs que queden buits. */
  function cleanBlocks(): GuideBlock[] {
    const cleaned: GuideBlock[] = [];
    for (const b of blocks) {
      if (b.kind === 'steps' || b.kind === 'list') {
        const items = b.items.map((i) => i.trim()).filter(Boolean);
        if (items.length > 0) cleaned.push({ ...b, items });
      } else if (b.kind === 'image') {
        if (b.src) cleaned.push({ ...b, caption: b.caption?.trim() || undefined });
      } else {
        const text = b.text.trim();
        if (text) cleaned.push({ ...b, text });
      }
    }
    return cleaned;
  }

  async function save() {
    if (!userName) return;
    if (!title.trim()) {
      setError(true);
      return;
    }
    const now = nowISO();
    // Ordre: conserva el de la secció existent; per a una de nova, va al final.
    const order =
      existing?.order ??
      (sections && sections.length > 0
        ? Math.max(...sections.map((s) => s.order)) + 1
        : 0);
    const section: GuideSection = {
      id: idRef.current,
      title: title.trim(),
      icon: icon || undefined,
      blocks: cleanBlocks(),
      order,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await commitGuideUpsert(userName, section);
    navigate('/guide');
  }

  async function remove() {
    if (!userName || !existing) return;
    await commitGuideDelete(userName, existing.id);
    navigate('/guide');
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <header>
        <h1 className="text-xl font-bold">
          {existing ? t.guideEditor.editTitle : t.guideEditor.newTitle}
        </h1>
      </header>

      {/* Capçalera: icona + títol */}
      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-boat-700">{t.guideEditor.iconLabel}</label>
        <IconPicker value={icon} onChange={setIcon} />

        <label className="text-sm font-medium text-boat-700">{t.guideEditor.titleLabel}</label>
        <input
          className={field}
          placeholder={t.guideEditor.titlePlaceholder}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(false);
          }}
        />
        {error && <p className="text-sm text-red-600">{t.guideEditor.titleRequired}</p>}
      </section>

      {/* Blocs de contingut */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-boat-700">{t.guideEditor.blocksLabel}</h2>
        <AddBlockMenu onAdd={(b) => insertBlock(0, b)} />
        {blocks.map((block, i) => (
          <div key={i} className="flex flex-col gap-3">
            <BlockEditor
              block={block}
              sectionId={idRef.current}
              canMoveUp={i > 0}
              canMoveDown={i < blocks.length - 1}
              onChange={(next) => updateBlock(i, next)}
              onMoveUp={() => moveBlock(i, -1)}
              onMoveDown={() => moveBlock(i, 1)}
              onDelete={() => deleteBlock(i)}
            />
            <AddBlockMenu onAdd={(b) => insertBlock(i + 1, b)} />
          </div>
        ))}
      </section>

      {/* Accions */}
      <section className="flex flex-col gap-2 pb-4">
        <ConfirmAction
          label={t.guideEditor.save}
          message={t.guideEditor.save + '?'}
          confirmLabel={t.guideEditor.saveConfirm}
          variant="primary"
          onConfirm={save}
        />
        {existing && (
          <ConfirmAction
            label={t.guideEditor.deleteSection}
            message={t.guideEditor.deleteSection + '?'}
            confirmLabel={t.guideEditor.deleteSectionConfirm}
            icon={Trash2}
            variant="danger"
            onConfirm={remove}
          />
        )}
        <Button variant="secondary" onClick={() => navigate('/guide')}>
          {t.common.cancel}
        </Button>
      </section>
    </div>
  );
}
