import type { GuideBlock } from '@/types/entities';
import { GuideImageField } from './GuideImageField';
import { Trash2, ChevronUp, ChevronDown } from '@/components/ui/icons';
import { t } from '@/text';

const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

/**
 * Editor d'un bloc de la guia. Renderitza el control adequat al `kind` del bloc i exposa
 * accions comunes: reordenar (▲▼) i eliminar (paperera). El bloc es representa sempre com
 * l'objecte `GuideBlock` complet; `steps`/`list` s'editen com a text (una línia = un ítem)
 * i es converteixen a/des de l'array aquí mateix.
 */
export function BlockEditor({
  block,
  sectionId,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: GuideBlock;
  sectionId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (next: GuideBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-boat-100 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-boat-400">
          {t.guideEditor.blockTypes[block.kind]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={t.guideEditor.moveUp}
            className="rounded-lg p-1.5 text-boat-500 disabled:opacity-30 active:scale-95"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={t.guideEditor.moveDown}
            className="rounded-lg p-1.5 text-boat-500 disabled:opacity-30 active:scale-95"
          >
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.guideEditor.deleteBlock}
            className="rounded-lg bg-red-50 p-1.5 text-red-600 active:scale-95"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <BlockBody block={block} sectionId={sectionId} onChange={onChange} />
    </div>
  );
}

function BlockBody({
  block,
  sectionId,
  onChange,
}: {
  block: GuideBlock;
  sectionId: string;
  onChange: (next: GuideBlock) => void;
}) {
  switch (block.kind) {
    case 'heading':
      return (
        <input
          className={`${field} font-semibold`}
          placeholder={t.guideEditor.headingPlaceholder}
          value={block.text}
          onChange={(e) => onChange({ kind: 'heading', text: e.target.value })}
        />
      );

    case 'paragraph':
      return (
        <textarea
          className={field}
          rows={4}
          placeholder={t.guideEditor.paragraphPlaceholder}
          value={block.text}
          onChange={(e) => onChange({ kind: 'paragraph', text: e.target.value })}
        />
      );

    case 'note':
      return (
        <textarea
          className={`${field} border-l-4 border-amber-400 bg-amber-50`}
          rows={3}
          placeholder={t.guideEditor.notePlaceholder}
          value={block.text}
          onChange={(e) => onChange({ kind: 'note', text: e.target.value })}
        />
      );

    case 'steps':
      return (
        <div className="flex flex-col gap-1">
          <textarea
            className={field}
            rows={4}
            placeholder={t.guideEditor.itemsPlaceholder}
            value={block.items.join('\n')}
            onChange={(e) =>
              onChange({ kind: 'steps', items: e.target.value.split('\n') })
            }
          />
          <p className="px-1 text-xs text-boat-400">{t.guideEditor.stepsHint}</p>
        </div>
      );

    case 'list':
      return (
        <div className="flex flex-col gap-1">
          <textarea
            className={field}
            rows={4}
            placeholder={t.guideEditor.itemsPlaceholder}
            value={block.items.join('\n')}
            onChange={(e) =>
              onChange({ kind: 'list', items: e.target.value.split('\n') })
            }
          />
          <p className="px-1 text-xs text-boat-400">{t.guideEditor.listHint}</p>
        </div>
      );

    case 'image':
      return (
        <GuideImageField
          sectionId={sectionId}
          src={block.src}
          caption={block.caption}
          onChange={({ src, caption }) => onChange({ kind: 'image', src, caption })}
        />
      );
  }
}
