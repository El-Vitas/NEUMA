'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { hasActionError } from '@/shared/lib/action-result';
import { movePageAction } from '../server/actions/pages.actions';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly page: PageSummary;
  readonly pages: readonly PageSummary[];
  readonly spaceId: string;
}

export const PagesMoveForm = ({ ariaLabelledBy, page, pages, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const [parentId, setParentId] = useState(page.parentId ?? 'root');
  const [isPending, startTransition] = useTransition();
  const possibleParents = pages.filter((candidate) => candidate.id !== page.id && candidate.lifecycle === 'ACTIVE');

  const movePage = () => {
    startTransition(async () => {
      const result = await movePageAction({
        pageId: page.id,
        parentId: parentId === 'root' ? null : parentId,
        spaceId,
      });
      if (hasActionError(result)) {
        toast.error(t('moveError'));
        return;
      }
      toast.success(t('moved'));
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-labelledby={ariaLabelledBy}
        className="min-h-11 min-w-0 flex-1 border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => setParentId(event.target.value)}
        value={parentId}
      >
        <option value="root">{t('spaceRoot')}</option>
        {possibleParents.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.title}
          </option>
        ))}
      </select>
      <PrimaryButton
        disabled={isPending || parentId === (page.parentId ?? 'root')}
        onClick={movePage}
        type="button"
        variant="secondary"
      >
        {isPending ? t('moving') : t('move')}
      </PrimaryButton>
    </div>
  );
};
