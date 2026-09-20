'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface IProps {
  readonly isBusy: boolean;
  readonly label: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  /** Cuántas filas se quedan sin valor, que es lo único que no se ve venir mirando la columna. */
  readonly rowCount: number;
}

/**
 * La pregunta antes de quitar una columna.
 *
 * Quitar una columna quita un valor de la propiedad en toda la colección, no
 * solo en esta vista, y las filas que estaban dentro se quedan sin valor. Se
 * dice cuántas son, porque una columna llena y una vacía se borran con el mismo
 * gesto y no cuestan lo mismo.
 */
export const PagesCollectionBoardColumnRemoveDialog = ({ isBusy, label, onClose, onConfirm, rowCount }: IProps) => {
  const t = useTranslations('pages.collection');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('removeColumnTitle', { column: label })}</DialogTitle>
          <DialogDescription>
            {t('removeColumnBody')}
            {rowCount > 0 && (
              <span className="mt-2 block font-medium text-foreground">
                {t('removeColumnRows', { count: rowCount })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="min-h-11" disabled={isBusy} onClick={onClose} type="button" variant="outline">
            {tCommon('cancel')}
          </Button>
          <Button className="min-h-11" disabled={isBusy} onClick={onConfirm} type="button" variant="destructive">
            {t('removeColumn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
