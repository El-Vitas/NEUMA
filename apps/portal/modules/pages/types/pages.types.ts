import type { PageContent, PageLifecycle } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';
import type { PagePropertyValues } from './pages.schema.types';

export type { PageContent, PageContentInlineNode, PageContentNode, PageLifecycle } from '@company-brain/shared';

export type PageEditorCommandKind = 'block' | 'mark' | 'history';

export type PageEditorCommandGroup = 'recent' | 'text' | 'lists' | 'media' | 'advanced';

export interface PageEditorCommand {
  readonly group?: PageEditorCommandGroup;
  readonly kind: PageEditorCommandKind;
  readonly labelKey: string;
  /** Which mark it puts on the writing, so a button can show that it is already on. */
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
  readonly createdAt: Date;
  readonly createdBy: null | PageAuthor;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: null | string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly updatedAt: Date;
  readonly updatedBy: null | PageAuthor;
  readonly version: number;
}

export interface PageTreeItem {
  readonly children: readonly PageTreeItem[];
  readonly page: PageSummary;
}
