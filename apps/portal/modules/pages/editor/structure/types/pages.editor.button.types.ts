import type { PageButtonDeed, PageButtonPlace } from '@company-brain/shared';
import type { Fragment } from 'prosemirror-model';

/** What a button and its workings are called, since none of it is writing to read. */
export interface PageEditorButtonLabels {
  readonly deed: string;
  readonly deeds: { readonly blocks: string; readonly row: string };
  readonly name: string;
  readonly needsCollection: string;
  readonly place: string;
  readonly places: { readonly below: string; readonly bottom: string; readonly top: string };
  readonly setup: string;
}

/** A button that was just pressed: where it stands, what it holds and what it is meant to do. */
export interface PageButtonPressed {
  readonly at: number;
  readonly content: Fragment;
  readonly deed: PageButtonDeed;
  readonly label: string;
  readonly pageId: string | null;
  readonly place: PageButtonPlace;
  readonly spaceId: string | null;
}
