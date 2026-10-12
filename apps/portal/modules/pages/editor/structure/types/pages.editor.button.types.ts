import type { PageButtonDeed, PageButtonPlace } from '@neuma/shared';
import type { Fragment } from 'prosemirror-model';

export interface PageEditorButtonLabels {
  readonly deed: string;
  readonly deeds: { readonly blocks: string; readonly row: string };
  readonly name: string;
  readonly needsCollection: string;
  readonly place: string;
  readonly places: { readonly below: string; readonly bottom: string; readonly top: string };
  readonly setup: string;
}

export interface PageButtonPressed {
  readonly at: number;
  readonly content: Fragment;
  readonly deed: PageButtonDeed;
  readonly label: string;
  readonly pageId: string | null;
  readonly place: PageButtonPlace;
  readonly spaceId: string | null;
}
