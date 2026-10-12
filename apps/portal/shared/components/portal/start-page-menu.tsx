'use client';

import { FileText, Table2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { usePagesStart } from '@/shared/hooks/use.pages-start.hook';

interface IProps {
  readonly align?: 'end' | 'start';
  readonly children: ReactNode;
  readonly onNavigate?: () => void;
  readonly parentId?: null | string;
  readonly spaceId: string;
}

/** The choice only decides how the page opens: a collection is a page with a shape that can be removed. */
export const StartPageMenu = ({ align = 'start', children, onNavigate, parentId = null, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const { isStarting, startCollection, startPage } = usePagesStart();

  const start = (begin: (spaceId: string, parentId?: null | string) => void): void => {
    onNavigate?.();
    begin(spaceId, parentId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem disabled={isStarting} onSelect={() => start(startPage)}>
          <FileText aria-hidden="true" className="size-4" />
          {t('startKinds.page')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isStarting} onSelect={() => start(startCollection)}>
          <Table2 aria-hidden="true" className="size-4" />
          {t('startKinds.collection')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
