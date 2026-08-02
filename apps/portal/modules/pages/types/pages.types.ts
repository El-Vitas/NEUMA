import type { PageContent, PageLifecycle } from '@company-brain/shared';

export type { PageContent, PageLifecycle } from '@company-brain/shared';

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
