'use client';

import type { PageBlockComment } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
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

/** Opens focused on the text area, not on the first button, which removes a comment. */
export const PagesEditorBlockCommentsDialog = ({ comments, isOpen, onClose, onRemove, onWrite }: IProps) => {
  const t = useTranslations('pages');
  const [body, setBody] = useState('');
  const writingRef = useRef<HTMLTextAreaElement>(null);

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
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          writingRef.current?.focus();
        }}
      >
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
          className="min-h-24 w-full rounded-none border border-input bg-transparent p-3 font-reading text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          onChange={(event) => setBody(event.target.value)}
          placeholder={t('writeBlockComment')}
          ref={writingRef}
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
