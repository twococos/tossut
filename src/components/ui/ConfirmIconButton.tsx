import { useState } from 'react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Trash2, type LucideIcon } from './icons';
import { t } from '@/text';

/**
 * Botó-icona discret (per defecte una paperera) que, en tocar-lo, obre un full de confirmació
 * a la part inferior de la pantalla PER SOBRE de tot (no inline dins la targeta). Pensat per a
 * accions destructives petites dins llistes (p.ex. eliminar un comentari). Per a accions
 * destructives grans amb botó complet, fes servir `ConfirmAction`/`ConfirmDelete`.
 */
export function ConfirmIconButton({
  icon: Icon = Trash2,
  ariaLabel,
  title,
  message,
  confirmLabel = t.confirmDelete.confirm,
  onConfirm,
}: {
  icon?: LucideIcon;
  ariaLabel: string;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-boat-400 active:scale-90 active:bg-red-50 active:text-red-600"
      >
        <Icon size={16} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-boat-700">{message}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                void onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
