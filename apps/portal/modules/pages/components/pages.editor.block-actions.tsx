'use client';

import type { PageBlockComment } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import { useState } from 'react';
import { createPageEditorBlockColorCommand } from '../lib/pages.editor.block-color.lib';
import {
  createPageEditorBlockCommentCommand,
  createPageEditorBlockCommentRemovalCommand,
} from '../lib/pages.editor.block-comment.lib';
import { duplicatePageEditorBlock } from '../lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import type { PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import type { PageEditorBlockConversion } from '../types/pages.editor.convert.types';
import type { PageDestination } from '../types/pages.editor.destination.types';
import { PagesEditorBlockCommentsDialog } from './pages.editor.block-comments.dialog';
import { PagesEditorBlockHandoverDialog } from './pages.editor.block-handover.dialog';
import { PagesEditorBlockMenu } from './pages.editor.block-menu';

interface IProps {
  readonly authorName: string;
  readonly colors: PageEditorBlockColors;
  readonly comments: readonly PageBlockComment[];
  readonly conversions: readonly PageEditorBlockConversion[];
  readonly hasIdentity: boolean;
  readonly menuPosition: { readonly left: number; readonly top: number } | null;
  readonly pageId: string | null;
  readonly spaceId: string;
  readonly onClose: () => void;
  readonly onCopyLink: () => void;
  readonly onHandOver: (page: PageDestination) => void;
  readonly onRunCommand: (command: Command) => void;
}

/**
 * Everything a block can be asked to do: the menu beside its grip, and the two
 * conversations that outlive it — where the blocks are going, and what has been
 * said about this one.
 *
 * The menu closes as soon as one of those opens, so the dialogs live here
 * rather than inside it.
 */
export const PagesEditorBlockActions = ({
  authorName,
  colors,
  comments,
  conversions,
  hasIdentity,
  menuPosition,
  onClose,
  onCopyLink,
  onHandOver,
  onRunCommand,
  pageId,
  spaceId,
}: IProps) => {
  const [isHandoverOpen, setHandoverOpen] = useState(false);
  const [areCommentsOpen, setCommentsOpen] = useState(false);

  const writeComment = (body: string): void => {
    onRunCommand(
      createPageEditorBlockCommentCommand({
        author: authorName,
        body,
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
      }),
    );
  };

  return (
    <>
      {menuPosition !== null && (
        <div className="absolute z-30" style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}>
          <PagesEditorBlockMenu
            colors={colors}
            conversions={conversions}
            hasIdentity={hasIdentity}
            onClose={onClose}
            onColor={(kind, color) => onRunCommand(createPageEditorBlockColorCommand(kind, color))}
            onComment={() => {
              onClose();
              setCommentsOpen(true);
            }}
            onConvert={(targetId) => onRunCommand(createPageEditorBlockConversionCommand(targetId))}
            onCopyLink={onCopyLink}
            onDelete={() => onRunCommand(deletePageEditorBlocks)}
            onDuplicate={() => onRunCommand(duplicatePageEditorBlock)}
            onMoveToPage={() => {
              onClose();
              setHandoverOpen(true);
            }}
          />
        </div>
      )}
      <PagesEditorBlockHandoverDialog
        exceptPageId={pageId}
        isOpen={isHandoverOpen}
        onCancel={() => setHandoverOpen(false)}
        onChoose={(page) => {
          setHandoverOpen(false);
          onHandOver(page);
        }}
        spaceId={spaceId}
      />
      <PagesEditorBlockCommentsDialog
        comments={comments}
        isOpen={areCommentsOpen}
        onClose={() => setCommentsOpen(false)}
        onRemove={(commentId) => onRunCommand(createPageEditorBlockCommentRemovalCommand(commentId))}
        onWrite={writeComment}
      />
    </>
  );
};
