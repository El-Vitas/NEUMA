'use client';

import type { PageBlockComment } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { PagesEditorBlockCommentItem } from './pages.editor.block-comments.item';

interface IProps {
  readonly comments: readonly PageBlockComment[];
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onRemove: (commentId: string) => void;
  readonly onWrite: (body: string) => void;
}

/**
 * What has been said about a block, and where to say something more.
 *
 * The remarks belong to the block, so this only shows them and hands back what
 * was written.
 */
export const PagesEditorBlockCommentsDialog = ({ comments, isOpen, onClose, onRemove, onWrite }: IProps) => {
  const t = useTranslations('pages');
  const [body, setBody] = useState('');

  const writeComment = (): void => {
    if (body.trim().length === 0) return;
    onWrite(body.trim());
    setBody('');
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) return;
        setBody('');
        onClose();
      }}
      open={isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('blockComments')}</DialogTitle>
          <DialogDescription>{t('blockCommentsDescription')}</DialogDescription>
        </DialogHeader>
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noBlockComments')}</p>
        ) : (
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {comments.map((comment) => (
              <PagesEditorBlockCommentItem comment={comment} key={comment.id} onRemove={onRemove} />
            ))}
          </ul>
        )}
        <textarea
          aria-label={t('writeBlockComment')}
          className="min-h-24 w-full border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('writeBlockComment')}
          value={body}
        />
        <div className="flex justify-end">
          <PrimaryButton disabled={body.trim().length === 0} onClick={writeComment} type="button">
            {t('addBlockComment')}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
