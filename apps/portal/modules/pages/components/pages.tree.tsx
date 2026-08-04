'use client';

import { FileText, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { hasActionError } from '@/shared/lib/action-result';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { flattenPageTree } from '../lib/pages.lib';
import { restorePageAction, trashPageAction } from '../server/actions/pages.actions';
import type { PageSummary, PageTreeItem } from '../types/pages.types';

interface IProps {
  readonly canEdit: boolean;
  readonly selectedPageId: string | null;
  readonly spaceId: string;
  readonly tree: readonly PageTreeItem[];
}

export const PagesTree = ({ canEdit, selectedPageId, spaceId, tree }: IProps) => {
  const t = useTranslations('pages');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = flattenPageTree(tree);

  const changeLifecycle = (page: PageSummary) => {
    startTransition(async () => {
      const action = page.lifecycle === 'TRASHED' ? restorePageAction : trashPageAction;
      const result = await action({ pageId: page.id, spaceId });
      if (hasActionError(result)) {
        toast.error(t('permissionError'));
        return;
      }
      toast.success(page.lifecycle === 'TRASHED' ? t('restored') : t('trashed'));
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <p className="border border-border border-dashed p-6 text-center text-muted-foreground text-sm">{t('empty')}</p>
    );
  }

  return (
    <nav aria-label={t('tree')}>
      <ul className="space-y-1">
        {items.map(({ depth, page }) => (
          <li className="flex items-center gap-1" key={page.id} style={{ paddingLeft: `${depth * 16}px` }}>
            <Link
              aria-current={selectedPageId === page.id ? 'page' : undefined}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 border border-transparent px-2 text-left text-sm hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={ROUTES.PORTAL_SPACE_PAGE(spaceId, page.id)}
            >
              <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{page.title}</span>
              {page.lifecycle === 'TRASHED' && <span className="text-muted-foreground text-xs">{t('trash')}</span>}
            </Link>
            {canEdit && (
              <PrimaryButton
                aria-label={
                  page.lifecycle === 'TRASHED'
                    ? t('restoreNamed', { name: page.title })
                    : t('trashNamed', { name: page.title })
                }
                className="min-h-11 min-w-11 shrink-0 px-2"
                disabled={isPending}
                onClick={() => changeLifecycle(page)}
                type="button"
                variant="secondary"
              >
                {page.lifecycle === 'TRASHED' ? (
                  <RotateCcw aria-hidden="true" className="size-4" />
                ) : (
                  <Trash2 aria-hidden="true" className="size-4" />
                )}
              </PrimaryButton>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};
