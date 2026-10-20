'use client';

import { History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { usePagesHistory } from '../hooks/use.pages.history';
import { PagesHistoryDetail } from './pages.history.detail';
import { PagesHistoryList } from './pages.history.list';
import { PagesHistoryRestoreDialog } from './pages.history.restore.dialog';

interface IProps {
  readonly canEdit: boolean;
  readonly pageId: string;
  readonly spaceId: string;
}

export const PagesHistoryPanel = ({ canEdit, pageId, spaceId }: IProps) => {
  const t = useTranslations('pages.versionHistory');
  const router = useRouter();
  const history = usePagesHistory({ pageId, spaceId });
  const { loadFirstPage } = history;
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);

  const handleOpenChange = (nextIsOpen: boolean): void => {
    setIsOpen(nextIsOpen);
    if (nextIsOpen) loadFirstPage();
  };

  const handleRestored = (): void => {
    setIsConfirmingRestore(false);
    setIsOpen(false);
    toast.success(t('restored'));
    router.refresh();
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger
        aria-label={t('open')}
        className={cn(
          'flex min-h-11 min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground',
          FOCUS_RING_CLASS,
        )}
        title={t('open')}
        type="button"
      >
        <History aria-hidden="true" className="size-4" />
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl" side="right">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        <div className="grid min-w-0 gap-4 px-4 pb-4 md:grid-cols-[14rem_minmax(0,1fr)]">
          <PagesHistoryList history={history} />
          <PagesHistoryDetail
            canRestore={canEdit}
            history={history}
            onRestore={() => setIsConfirmingRestore(true)}
            spaceId={spaceId}
          />
        </div>
        {isConfirmingRestore && history.selectedVersion !== null && (
          <PagesHistoryRestoreDialog
            onClose={() => setIsConfirmingRestore(false)}
            onRestored={handleRestored}
            pageId={pageId}
            spaceId={spaceId}
            version={history.selectedVersion}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
