'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import type { PagesCoverController } from '../types/pages.cover.types';
import { PagesCoverMenu } from './pages.cover.menu';

interface IProps {
  readonly controller: PagesCoverController;
}

/** Sits among the page-wide controls so a page without a cover does not reserve a row for it. */
export const PagesCoverField = ({ controller }: IProps) => {
  const t = useTranslations('pages.cover');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Popover onOpenChange={setIsMenuOpen} open={isMenuOpen}>
      <PopoverTrigger
        aria-busy={controller.isPending}
        aria-label={t('menuLabel')}
        className={cn(
          'grid size-11 place-items-center text-muted-foreground hover:text-foreground',
          FOCUS_RING_CLASS,
          controller.isPending && 'opacity-50',
        )}
        disabled={controller.isPending}
        title={controller.isPending ? t('uploading') : t('menuLabel')}
      >
        <ImageIcon aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(16rem,calc(100vw-2rem))] p-1">
        <PagesCoverMenu controller={controller} onDone={() => setIsMenuOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
