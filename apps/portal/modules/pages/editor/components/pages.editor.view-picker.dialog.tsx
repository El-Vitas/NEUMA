'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import type { PageCollectionView } from '../../collections/types/pages.collections.types';

interface IProps {
  readonly onCancel: () => void;
  readonly onChoose: (viewName: string) => void;
  /** Las vistas de la colección elegida, o ninguna mientras no se haya elegido una. */
  readonly views: readonly PageCollectionView[] | null;
}

/**
 * Cuál de las vistas de la colección se muestra aquí.
 *
 * Se pregunta porque una colección se mira de varias maneras y la que abre por
 * defecto no tiene por qué ser la que corresponde en medio de un texto: un
 * gráfico junto al párrafo que lo comenta, y la tabla en su propia página.
 *
 * Solo aparece cuando hay más de una: con una sola no hay nada que preguntar.
 */
export const PagesEditorViewPickerDialog = ({ onCancel, onChoose, views }: IProps) => {
  const t = useTranslations('pages');

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      open={views !== null}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('collection.viewPickTitle')}</DialogTitle>
          <DialogDescription>{t('collection.viewPickDescription')}</DialogDescription>
        </DialogHeader>
        <ul className="m-0 list-none space-y-1 p-0">
          {(views ?? []).map((view) => (
            <li key={view.name}>
              <Button
                className="min-h-11 w-full justify-start gap-2"
                onClick={() => onChoose(view.name)}
                type="button"
                variant="ghost"
              >
                <span className="font-medium text-foreground text-sm">{view.name}</span>
                <span className="text-muted-foreground text-xs">{t(`collection.viewTypes.${view.type}`)}</span>
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
