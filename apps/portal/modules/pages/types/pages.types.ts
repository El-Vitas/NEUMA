import type { PageContent, PageLifecycle } from '@neuma/shared';
import type { Command } from 'prosemirror-state';
import type { PageCoverValue } from '../appearance/types/pages.cover.types';
import type { PageIcon } from '../appearance/types/pages.icon.types';
import type { PagePropertyValues } from '../collections/types/pages.schema.types';

export type { PageContent, PageContentInlineNode, PageContentNode, PageLifecycle } from '@neuma/shared';

export type PageEditorCommandKind = 'block' | 'mark' | 'history';

export type PageEditorCommandGroup = 'recent' | 'text' | 'lists' | 'media' | 'advanced';

export interface PageEditorCommand {
  readonly group?: PageEditorCommandGroup;
  readonly kind: PageEditorCommandKind;
  readonly labelKey: string;
  readonly mark?: string;
  readonly run: Command;
}

export interface PageAuthor {
  readonly id: string;
  readonly name: string;
}

export type PageAssetNodeType = 'audio' | 'file' | 'image' | 'video';

export interface PageAssetInsertCommandOptions {
  readonly alt?: string;
  readonly assetId: string;
  readonly caption?: string;
  readonly mimeType?: string;
  readonly size?: number;
}

export interface PageMentionInsertCommandOptions {
  readonly label: string;
  readonly pageId: string;
  readonly spaceId: string;
}

export interface PageSummary {
  readonly content: PageContent;
  readonly cover?: PageCoverValue | null;
  readonly createdAt: Date;
  readonly createdBy: null | PageAuthor;
  readonly icon?: PageIcon | null;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly lockedAt?: Date | null;
  readonly order: number;
  readonly owner?: null | PageAuthor;
  readonly parentId: null | string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly updatedAt: Date;
  readonly updatedBy: null | PageAuthor;
  /** Null means a verified page never expires. */
  readonly verificationExpiresAt?: Date | null;
  /** Kept when the verification expires. */
  readonly verifiedAt?: Date | null;
  readonly verifiedBy?: null | PageAuthor;
  readonly version: number;
}

export interface PageTreeItem {
  readonly children: readonly PageTreeItem[];
  readonly page: PageSummary;
}
