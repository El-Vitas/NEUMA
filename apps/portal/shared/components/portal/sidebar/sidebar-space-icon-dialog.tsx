'use client';

import type { PageIcon, PageIconColor } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { PagesIconMenu } from '@/modules/pages/components/pages.icon.menu';
import { pickRandomPageEmojiIcon, pickRandomPageIconSymbolName } from '@/modules/pages/lib/pages.icon.lib';
import {
  removeSpaceIconAction,
  setSpaceIconEmojiAction,
  setSpaceIconSymbolAction,
} from '@/modules/spaces/server/actions/spaces.icon.actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { isActionSuccess } from '@/shared/lib/action-result';

interface IProps {
  readonly onChanged: () => void;
  readonly onClose: () => void;
  readonly space: { readonly icon: null | PageIcon; readonly id: string; readonly name: string } | null;
}

/**
 * A space's mark changed from the tree.
 *
 * It offers what a page offers, minus the picture: a space is drawn beside
 * pages at the size of a line of text, and an uploaded image there is a face
 * nobody can read.
 */
export const SidebarSpaceIconDialog = ({ onChanged, onClose, space }: IProps) => {
  const t = useTranslations('navigation');
  const pagesT = useTranslations('pages');
  const [isPending, startTransition] = useTransition();

  if (space === null) return null;

  const symbolColor: PageIconColor = space.icon !== null && space.icon.kind === 'symbol' ? space.icon.color : 'default';

  const runIconMutation = (mutate: () => Promise<unknown>): void => {
    startTransition(async () => {
      const result = await mutate();
      if (!isActionSuccess(result)) {
        toast.error(pagesT('permissionError'));
        return;
      }
      onChanged();
      onClose();
    });
  };

  const chooseEmoji = (value: string): void =>
    runIconMutation(() => setSpaceIconEmojiAction({ spaceId: space.id, value }));

  const chooseSymbol = (name: string, color: PageIconColor): void =>
    runIconMutation(() => setSpaceIconSymbolAction({ color, name, spaceId: space.id }));

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="w-[min(22rem,calc(100vw-2rem))] max-w-none overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('changeSpaceIcon')}</DialogTitle>
        </DialogHeader>
        <PagesIconMenu
          hasIcon={space.icon !== null}
          isPending={isPending}
          onChooseEmoji={chooseEmoji}
          onChooseSymbol={chooseSymbol}
          onRandomEmoji={() => chooseEmoji(pickRandomPageEmojiIcon().value)}
          onRandomSymbol={(color) => chooseSymbol(pickRandomPageIconSymbolName(), color)}
          onRemove={() => runIconMutation(() => removeSpaceIconAction({ spaceId: space.id }))}
          symbolColor={symbolColor}
        />
      </DialogContent>
    </Dialog>
  );
};
