import type { RefObject } from 'react';

export interface PagesEditorTitle {
  readonly setTitle: (title: string) => void;
  readonly title: string;
  readonly titleRef: RefObject<string>;
}
