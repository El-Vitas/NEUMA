'use client';

import type { CommentView } from '@neuma/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';
import { readCommentDraft } from '../lib/pages.discussions.composer.lib';
import { PagesDiscussionsBody } from './pages.discussions.body';
import { PagesDiscussionsComposer } from './pages.discussions.composer';

interface IProps {
  readonly comment: CommentView;
  readonly currentUserId: string | null;
  readonly onEdit: (commentId: string, body: CommentView['body']) => Promise<boolean>;
  readonly onRemove: (commentId: string) => Promise<void>;
  readonly personOptions: readonly PagePersonOption[];
}

export const PagesDiscussionsComment = ({ comment, currentUserId, onEdit, onRemove, personOptions }: IProps) => {
  const t = useTranslations('pages');
  const format = useFormatter();
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const writtenAt = new Date(comment.createdAt);

  if (comment.isDeleted) {
    return (
      <li className="border border-border border-dashed p-3 text-muted-foreground text-sm italic">
        {t('discussions.deletedComment')}
      </li>
    );
  }

  const remove = async (): Promise<void> => {
    setIsBusy(true);
    await onRemove(comment.id);
    setIsBusy(false);
  };

  return (
    <li className="border border-border bg-surface-low p-3" data-comment-id={comment.id}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground text-sm">{comment.authorName}</span>
        <span className="text-muted-foreground text-xs">
          {Number.isNaN(writtenAt.getTime())
            ? ''
            : format.dateTime(writtenAt, { dateStyle: 'short', timeStyle: 'short' })}
          {comment.editedAt !== null && ` · ${t('discussions.edited')}`}
        </span>
      </div>
      {isEditing ? (
        <div className="mt-2">
          <PagesDiscussionsComposer
            focusOnOpen
            initialDraft={readCommentDraft(comment.body)}
            isBusy={false}
            label={t('discussions.editComment')}
            onCancel={() => setIsEditing(false)}
            onSubmit={async (body) => {
              const isKept = await onEdit(comment.id, body);
              if (isKept) setIsEditing(false);
              return false;
            }}
            personOptions={personOptions}
            submitLabel={t('discussions.save')}
          />
        </div>
      ) : (
        <div className="mt-1">
          <PagesDiscussionsBody body={comment.body} currentUserId={currentUserId} />
        </div>
      )}
      {!isEditing && (comment.canEdit || comment.canDelete) && (
        <div className="mt-2 flex gap-1">
          {comment.canEdit && (
            <Button className="min-h-11" onClick={() => setIsEditing(true)} size="sm" type="button" variant="ghost">
              {t('discussions.edit')}
            </Button>
          )}
          {comment.canDelete && (
            <Button
              className="min-h-11"
              disabled={isBusy}
              onClick={() => void remove()}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t('discussions.delete')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
};
