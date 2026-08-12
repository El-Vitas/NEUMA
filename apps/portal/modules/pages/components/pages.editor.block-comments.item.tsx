'use client';

import type { PageBlockComment } from '@company-brain/shared';
import { useFormatter, useTranslations } from 'next-intl';

interface IProps {
  readonly comment: PageBlockComment;
  readonly onRemove: (commentId: string) => void;
}

/** One remark: who said it, when, and what it says. */
export const PagesEditorBlockCommentItem = ({ comment, onRemove }: IProps) => {
  const t = useTranslations('pages');
  const format = useFormatter();
  const writtenAt = new Date(comment.createdAt);

  return (
    <li className="border border-border bg-surface-container-low p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground text-sm">{comment.author}</span>
        <span className="text-muted-foreground text-xs">
          {Number.isNaN(writtenAt.getTime())
            ? ''
            : format.dateTime(writtenAt, { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-foreground text-sm">{comment.body}</p>
      <button
        className="mt-2 min-h-11 text-muted-foreground text-xs hover:text-foreground"
        onClick={() => onRemove(comment.id)}
        type="button"
      >
        {t('removeBlockComment')}
      </button>
    </li>
  );
};
