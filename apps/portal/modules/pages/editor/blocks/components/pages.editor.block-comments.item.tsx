'use client';

import type { PageBlockComment } from '@neuma/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface IProps {
  readonly comment: PageBlockComment;
  readonly onRemove: (commentId: string) => void;
}

export const PagesEditorBlockCommentItem = ({ comment, onRemove }: IProps) => {
  const t = useTranslations('pages');
  const format = useFormatter();
  const writtenAt = new Date(comment.createdAt);

  return (
    <li className="border border-border bg-surface-low p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground text-sm">{comment.author}</span>
        <span className="text-muted-foreground text-xs">
          {Number.isNaN(writtenAt.getTime())
            ? ''
            : format.dateTime(writtenAt, { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap font-reading text-foreground text-sm">{comment.body}</p>
      <Button className="mt-2 min-h-11" onClick={() => onRemove(comment.id)} size="sm" type="button" variant="ghost">
        {t('removeBlockComment')}
      </Button>
    </li>
  );
};
