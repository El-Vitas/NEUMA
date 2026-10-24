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
  readonly template: string;
  readonly templateDefault: string;
}

/** A template of the collection a button points to, as the choice of the button lists it. */
export interface PageButtonTemplateChoice {
  readonly id: string;
  readonly title: string;
}

export type PageButtonTemplatesReader = (
  collectionId: string,
  spaceId: string,
) => Promise<readonly PageButtonTemplateChoice[]>;

export interface PageButtonPressed {
  readonly at: number;
  readonly content: Fragment;
  readonly deed: PageButtonDeed;
  readonly label: string;
  readonly pageId: string | null;
  readonly place: PageButtonPlace;
  readonly spaceId: string | null;
  /** Null takes the default template of the collection. */
  readonly templateId: string | null;
}
