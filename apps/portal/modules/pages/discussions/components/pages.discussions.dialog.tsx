'use client';

import type { BlockRichText } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { usePagesDiscussionsContext } from '../hooks/use.pages.discussions.context';
import { groupDiscussionsByBlock, orderDiscussionsForReading } from '../lib/pages.discussions.lib';
import { PagesDiscussionsComposer } from './pages.discussions.composer';
import { PagesDiscussionsThread } from './pages.discussions.thread';

interface IProps {
  readonly blockId: string | null;
  /** The discussion to show first, when the address or a click on commented words named one. */
  readonly focusDiscussionId: string | null;
  /** The words selected when commenting began, which a new discussion will quote. */
  readonly fragmentQuote: string | null;
  readonly isOpen: boolean;
  readonly canStart: boolean;
  readonly onAnchor: (discussionId: string) => void;
  readonly onClose: () => void;
  readonly onUnanchor: (discussionId: string) => void;
}

/** The conversations of one block, or of the words selected in it, with a box to start another. */
export const PagesDiscussionsDialog = ({
  blockId,
  canStart,
  focusDiscussionId,
  fragmentQuote,
  isOpen,
  onAnchor,
  onClose,
  onUnanchor,
}: IProps) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const context = usePagesDiscussionsContext();
  const [isBusy, setIsBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  if (context === null) return null;
  const ofBlock = blockId === null ? [] : (groupDiscussionsByBlock(context.api.discussions).get(blockId) ?? []);
  const discussions = orderDiscussionsForReading(ofBlock);
  const { api, currentUserId, personOptions } = context;
  const open = discussions.filter((discussion) => discussion.resolvedAt === null);
  const resolved = discussions.filter((discussion) => discussion.resolvedAt !== null);
  const isFocusedResolved = resolved.some((discussion) => discussion.id === focusDiscussionId);
  const shown = showResolved || isFocusedResolved ? [...open, ...resolved] : open;

  const tell = (reason: string): void => {
    toast.error(tErrors(`reasons.${reason}` as 'reasons.unexpected'));
  };

  const start = async (body: BlockRichText): Promise<boolean> => {
    if (blockId === null) return false;
    setIsBusy(true);
    const outcome = await api.open(blockId, body, fragmentQuote ?? undefined).finally(() => setIsBusy(false));
    if (!outcome.isOk) {
      tell(outcome.reason);
      return false;
    }
    if (outcome.value.anchorMarkId !== null) onAnchor(outcome.value.anchorMarkId);
    return true;
  };

  const reply = async (discussionId: string, body: BlockRichText): Promise<boolean> => {
    const outcome = await api.reply(discussionId, body);
    if (!outcome.isOk) tell(outcome.reason);
    return outcome.isOk;
  };

  const edit = async (commentId: string, body: BlockRichText): Promise<boolean> => {
    const outcome = await api.edit(commentId, body);
    if (!outcome.isOk) tell(outcome.reason);
    return outcome.isOk;
  };

  const remove = async (commentId: string): Promise<void> => {
    const discussion = discussions.find((entry) => entry.comments.some((comment) => comment.id === commentId));
    const outcome = await api.remove(commentId);
    if (!outcome.isOk) tell(outcome.reason);
    else if (discussion?.anchorMarkId != null) onUnanchor(discussion.anchorMarkId);
  };

  const change = async (work: () => Promise<{ readonly isOk: boolean; readonly reason?: string }>): Promise<void> => {
    const outcome = await work();
    if (!outcome.isOk) tell(outcome.reason ?? 'unexpected');
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next) return;
        setShowResolved(false);
        onClose();
      }}
      open={isOpen}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('discussions.title')}</DialogTitle>
          <DialogDescription>{t('discussions.description')}</DialogDescription>
        </DialogHeader>
        {api.status === 'failed' && <p className="text-destructive text-sm">{t('discussions.loadFailed')}</p>}
        {shown.length === 0 && api.status !== 'failed' && (
          <p className="text-muted-foreground text-sm">{t('discussions.none')}</p>
        )}
        <ul className="space-y-3">
          {shown.map((discussion) => (
            <PagesDiscussionsThread
              currentUserId={currentUserId}
              discussion={discussion}
              isFocused={discussion.id === focusDiscussionId}
              key={discussion.id}
              onEdit={edit}
              onRemove={remove}
              onReopen={(id) => change(() => api.reopen(id))}
              onReply={reply}
              onResolve={(id) => change(() => api.resolve(id))}
              personOptions={personOptions}
            />
          ))}
        </ul>
        {resolved.length > 0 && !isFocusedResolved && (
          <Button
            className="min-h-11 self-start"
            onClick={() => setShowResolved((shownBefore) => !shownBefore)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showResolved ? t('discussions.hideResolved') : t('discussions.showResolved', { count: resolved.length })}
          </Button>
        )}
        {canStart && blockId !== null && (
          <div className="space-y-2 border-border border-t pt-3">
            {fragmentQuote !== null && (
              <blockquote className="border-primary/60 border-l-2 pl-2 font-reading text-muted-foreground text-sm italic">
                {fragmentQuote}
              </blockquote>
            )}
            <PagesDiscussionsComposer
              isBusy={isBusy}
              label={fragmentQuote === null ? t('discussions.newOnBlock') : t('discussions.newOnSelection')}
              onSubmit={start}
              personOptions={personOptions}
              submitLabel={t('discussions.comment')}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
