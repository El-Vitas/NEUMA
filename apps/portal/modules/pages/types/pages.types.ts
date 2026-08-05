import type { PageContent, PageLifecycle } from '@company-brain/shared';
import type { Command } from 'prosemirror-state';

export type {
  PageContent,
  PageContentInlineNode,
  PageContentMention,
  PageContentNode,
  PageContentText,
  PageLifecycle,
} from '@company-brain/shared';

export interface PageEditorCommand {
  readonly labelKey: string;
  readonly run: Command;
}

export type PageAssetNodeType = 'file' | 'image';

export interface PageAssetInsertCommandOptions {
  readonly alt?: string;
  readonly assetId: string;
  readonly caption?: string;
}

export interface PageMentionInsertCommandOptions {
  readonly label: string;
  readonly pageId: string;
  readonly spaceId: string;
}

export interface PageSummary {
  readonly content: PageContent;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export interface PageTreeItem {
  readonly children: readonly PageTreeItem[];
  readonly page: PageSummary;
}

export interface FlatPageTreeItem {
  readonly depth: number;
  readonly page: PageSummary;
}
