import { useState } from 'react';
import type { GuideBlock } from '@/types/entities';
import { Plus } from '@/components/ui/icons';
import { t } from '@/text';

/** Els tipus de bloc en l'ordre en què surten al desplegable. */
const BLOCK_KINDS: GuideBlock['kind'][] = [
  'heading',
  'paragraph',
  'note',
  'steps',
  'list',
  'image',
];

/** Crea un bloc buit del tipus demanat. */
function emptyBlock(kind: GuideBlock['kind']): GuideBlock {
  switch (kind) {
    case 'heading':
      return { kind: 'heading', text: '' };
    case 'paragraph':
      return { kind: 'paragraph', text: '' };
    case 'note':
      return { kind: 'note', text: '' };
    case 'steps':
      return { kind: 'steps', items: [] };
    case 'list':
      return { kind: 'list', items: [] };
    case 'image':
      return { kind: 'image', src: '' };
  }
}

/**
 * Botó "＋ Afegir bloc" que, en clicar, desplega els tipus de bloc disponibles. En triar-ne
 * un, crida `onAdd` amb un bloc buit d'aquell tipus. Es col·loca al principi, al final i
 * entre cada bloc de l'editor de secció.
 */
export function AddBlockMenu({ onAdd }: { onAdd: (block: GuideBlock) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-boat-200 py-2 text-sm font-medium text-boat-500 active:scale-[0.99]"
      >
        <Plus size={16} />
        {t.guideEditor.addBlock}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-boat-100 bg-boat-50 p-2">
      {BLOCK_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => {
            onAdd(emptyBlock(kind));
            setOpen(false);
          }}
          className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-boat-800 shadow-sm active:scale-95"
        >
          {t.guideEditor.blockTypes[kind]}
        </button>
      ))}
    </div>
  );
}
