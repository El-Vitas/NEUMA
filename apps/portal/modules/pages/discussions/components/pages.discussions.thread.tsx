'use client';

import type { BlockRichText, DiscussionView } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';
import { PagesDiscussionsComment } from './pages.discussions.comment';
import { PagesDiscussionsComposer } from './pages.discussions.composer';

interface IProps {
  readonly currentUserId: string | null;
  readonly discussion: DiscussionView;
  readonly isFocused: boolean;
  readonly onEdit: (commentId: string, body: BlockRichText) => Promise<boolean>;
  readonly onRemove: (commentId: string) => Promise<void>;
  readonly onReopen: (discussionId: string) => Promise<void>;
  readonly onReply: (discussionId: string, body: BlockRichText) => Promise<boolean>;
  readonly onResolve: (discussionId: string) => Promise<void>;
  readonly personOptions: readonly PagePersonOption[];
}

/** One conversation: what it quotes, every message in order, a reply box, and resolve or reopen. */
export const PagesDiscussionsThread = ({
  currentUserId,
  discussion,
  isFocused,
  onEdit,
  onRemove,
  onReopen,
  onReply,
  onResolve,
  personOptions,
}: IProps) => {
  const t = useTranslations('pages');
  const [isBusy, setIsBusy] = useState(false);
  const isResolved = discussion.resolvedAt !== null;

  const change = async (work: () => Promise<void>): Promise<void> => {
    setIsBusy(true);
    try {
      await work();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <li
      aria-label={t('discussions.thread')}
      className={cn('space-y-2 border p-3', isFocused ? 'border-primary' : 'border-border', isResolved && 'opacity-75')}
      data-discussion-id={discussion.id}
      data-resolved={isResolved}
    >
      <div className="flex items-start justify-between gap-2">
        {discussion.quote === null ? (
          <p className="text-muted-foreground text-xs">{t('discussions.aboutBlock')}</p>
        ) : (
          <blockquote className="border-primary/60 border-l-2 pl-2 font-reading text-muted-foreground text-sm italic">
            {discussion.quote}
          </blockquote>
        )}
        {discussion.canComment && (
          <Button
            className="min-h-11 shrink-0"
            disabled={isBusy}
            onClick={() => void change(() => (isResolved ? onReopen(discussion.id) : onResolve(discussion.id)))}
            size="sm"
            type="button"
            variant="outline"
          >
            {isResolved ? t('discussions.reopen') : t('discussions.resolve')}
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {discussion.comments.map((comment) => (
          <PagesDiscussionsComment
            comment={comment}
            currentUserId={currentUserId}
            key={comment.id}
            onEdit={onEdit}
            onRemove={onRemove}
            personOptions={personOptions}
          />
        ))}
      </ul>
      {discussion.canComment && (
        <PagesDiscussionsComposer
          isBusy={isBusy}
          label={t('discussions.reply')}
          onSubmit={(body) => onReply(discussion.id, body)}
          personOptions={personOptions}
          submitLabel={t('discussions.reply')}
        />
      )}
    </li>
  );
};
