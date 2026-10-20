'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { usePagesSharingAccess } from '../hooks/use.pages.sharing.access';
import type { SharingChange, SharingScope } from '../types/pages.sharing.types';
import { PagesSharingEditor } from './pages.sharing.editor';

interface IProps {
  readonly blockId: string;
  readonly onChanged: (change: SharingChange) => void;
  readonly onClose: () => void;
  readonly scope: SharingScope;
  readonly spaceId: string;
  readonly title: string;
}

/** Mounted only while open: it asks the server who has access each time, and holds the draft until it is saved. */
export const PagesSharingDialog = ({ blockId, onChanged, onClose, scope, spaceId, title }: IProps) => {
  const t = useTranslations('pages.sharing');
  const { reload, state } = usePagesSharingAccess(blockId);

  const renderBody = () => {
    if (state.kind === 'loading') {
      return (
        <p className="text-muted-foreground text-sm" role="status">
          {t('loading')}
        </p>
      );
    }
    if (state.kind === 'failed' && state.reason === 'forbidden') {
      return <p className="text-sm">{t('loadForbidden')}</p>;
    }
    if (state.kind === 'failed') {
      return (
        <div className="space-y-2">
          <p className="text-sm" role="alert">
            {t('loadError')}
          </p>
          <Button className="min-h-11" onClick={reload} type="button" variant="outline">
            {t('retry')}
          </Button>
        </div>
      );
    }
    return (
      <PagesSharingEditor
        access={state.access}
        onChanged={onChanged}
        onClose={onClose}
        scope={scope}
        spaceId={spaceId}
      />
    );
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{scope === 'page' ? t('title') : t('blockTitle')}</DialogTitle>
          <DialogDescription>
            {scope === 'page' ? t('description') : t('blockDescription')}
            {title !== '' && <span className="mt-1 block truncate font-medium text-foreground">{title}</span>}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
};
