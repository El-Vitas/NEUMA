'use client';

import type { PageBlockComment } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import { createPageEditorBlockColorCommand } from '../lib/pages.editor.block-color.lib';
import {
  createPageEditorBlockCommentCommand,
  createPageEditorBlockCommentRemovalCommand,
} from '../lib/pages.editor.block-comment.lib';
import { duplicatePageEditorBlock } from '../lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { createPageEditorBlockConversionCommand } from '../lib/pages.editor.convert.lib';
import type { PageEditorBlockColors } from '../types/pages.editor.block-color.types';
import type { PageEditorBlockRequest, PageEditorBlockRequestKind } from '../types/pages.editor.block-request.types';
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
  readonly onAsk: (kind: PageEditorBlockRequestKind) => void;
  readonly onBecomePage: () => void;
  readonly pageId: string | null;
  readonly request: PageEditorBlockRequest | null;
  readonly spaceId: string;
  readonly onClose: (kind: PageEditorBlockRequestKind) => void;
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
  onAsk,
  onBecomePage,
  onClose,
  onCopyLink,
  onHandOver,
  onRunCommand,
  pageId,
  request,
  spaceId,
}: IProps) => {
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
      {menuPosition !== null && request?.kind === 'actions' && (
        <div className="absolute z-30" style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}>
          <PagesEditorBlockMenu
            canBecomePage={pageId !== null}
            colors={colors}
            conversions={conversions}
            hasIdentity={hasIdentity}
            onBecomePage={onBecomePage}
            onClose={() => onClose('actions')}
            onColor={(kind, color) => onRunCommand(createPageEditorBlockColorCommand(kind, color))}
            onComment={() => onAsk('comments')}
            onConvert={(targetId) => onRunCommand(createPageEditorBlockConversionCommand(targetId))}
            onCopyLink={onCopyLink}
            onDelete={() => onRunCommand(deletePageEditorBlocks)}
            onDuplicate={() => onRunCommand(duplicatePageEditorBlock)}
            onMoveToPage={() => onAsk('handover')}
          />
        </div>
      )}
      <PagesEditorBlockHandoverDialog
        exceptPageId={pageId}
        isOpen={request?.kind === 'handover'}
        onCancel={() => onClose('handover')}
        onChoose={onHandOver}
        spaceId={spaceId}
      />
      <PagesEditorBlockCommentsDialog
        comments={comments}
        isOpen={request?.kind === 'comments'}
        onClose={() => onClose('comments')}
        onRemove={(commentId) => onRunCommand(createPageEditorBlockCommentRemovalCommand(commentId))}
        onWrite={writeComment}
      />
    </>
  );
};
