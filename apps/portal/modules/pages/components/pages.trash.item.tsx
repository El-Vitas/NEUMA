'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { isActionSuccess } from '@/shared/lib/action-result';
import { formatDate } from '@/shared/utils/formatters';
import { restorePageAction } from '../server/actions/pages.actions';
import { getPageRestorePreviewAction } from '../server/actions/pages.trash.actions';
import type { TrashDescendantsPreview, TrashedPage, TrashRestoreOutcome } from '../types/pages.trash.types';
import { PagesTrashDeleteForeverDialog } from './pages.trash.delete-forever.dialog';
import { PagesTrashRestoreChildPagesDialog } from './pages.trash.restore-child-pages.dialog';

interface IProps {
  readonly locale: string;
  readonly page: TrashedPage;
}

export const PagesTrashItem = ({ locale, page }: IProps) => {
  const t = useTranslations('pages');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRestorePromptOpen, setIsRestorePromptOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const title = page.title.length > 0 ? page.title : t('untitled');

  const performRestore = async (includeChildren: boolean): Promise<void> => {
    const result = await restorePageAction({ includeChildren, pageId: page.id, spaceId: page.spaceId });
    if (!isActionSuccess<TrashRestoreOutcome>(result)) {
      toast.error(t('trashScreen.restoreError'));
      return;
    }
    toast.success(result.data.restoredToRoot ? t('trashScreen.restoredToRoot') : t('restored'));
    router.refresh();
  };

  const requestRestore = (): void => {
    startTransition(async () => {
      const preview = await getPageRestorePreviewAction({ pageId: page.id, spaceId: page.spaceId });
      const childPageCount = isActionSuccess<TrashDescendantsPreview>(preview)
        ? preview.data.childPageCount
        : page.trashedChildCount;
      if (childPageCount > 0) {
        setIsRestorePromptOpen(true);
        return;
      }
      await performRestore(false);
    });
  };

  const confirmRestoreWithChildren = (includeChildren: boolean): void => {
    setIsRestorePromptOpen(false);
    startTransition(() => performRestore(includeChildren));
  };

  return (
    <li className="flex flex-col gap-3 bg-surface px-4 py-3 transition-colors hover:bg-surface-container-low sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-base text-foreground">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm">
          {t('trashScreen.deletedAt')}: {formatDate(page.deletedAt, { includeTime: true, locale })}
          {' · '}
          {t('trashScreen.deletedBy')}: {page.deletedBy?.name ?? '—'}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button className="min-h-11" disabled={isPending} onClick={requestRestore} type="button" variant="outline">
          {t('restorePage')}
        </Button>
        <Button
          className="min-h-11"
          disabled={isPending}
          onClick={() => setIsDeleteDialogOpen(true)}
          type="button"
          variant="destructive"
        >
          {t('trashScreen.deleteForever')}
        </Button>
      </div>
      <PagesTrashRestoreChildPagesDialog
        onClose={() => setIsRestorePromptOpen(false)}
        onConfirm={confirmRestoreWithChildren}
        open={isRestorePromptOpen}
      />
      <PagesTrashDeleteForeverDialog
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleted={() => router.refresh()}
        page={isDeleteDialogOpen ? { id: page.id, spaceId: page.spaceId, title } : null}
      />
    </li>
  );
};
