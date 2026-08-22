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
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';

interface IProps {
  readonly conversion: PageEditorBlockConversion | null;
  readonly onCancel: () => void;
  readonly onConfirm: (targetId: string) => void;
}

/**
 * Asks before a conversion that would leave something behind, naming the type
 * it is about to become, so losing content is always a decision and never a
 * surprise.
 */
export const PagesEditorTurnIntoConfirmDialog = ({ conversion, onCancel, onConfirm }: IProps) => {
  const t = useTranslations('pages');
  if (conversion === null) return null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      open
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('turnIntoWarningTitle')}</DialogTitle>
          <DialogDescription>
            {t('turnIntoWarningDescription', { blockType: t(`blockTypes.${conversion.labelKey}`) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel} type="button" variant="outline">
            {t('turnIntoCancel')}
          </Button>
          <Button onClick={() => onConfirm(conversion.id)} type="button">
            {t('turnIntoConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
