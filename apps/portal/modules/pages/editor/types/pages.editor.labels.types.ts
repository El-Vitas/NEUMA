import type { PageCollectionWording } from '../../collections/types/pages.collections.types';
import type { PageEditorNodeViewLabels } from '../blocks/types/pages.editor.node-views.types';

export interface PageEditorLabels {
  readonly blockComments: string;
  readonly blockTooLong: string;
  readonly buttonEmpty: string;
  readonly collectionWording: PageCollectionWording;
  readonly foldHeading: string;
  readonly insertBlock: string;
  readonly newCollectionTitle: string;
  readonly nodeViews: PageEditorNodeViewLabels;
  readonly resizeColumn: string;
  readonly selectBlock: string;
  readonly untitled: string;
  readonly writeHere: string;
}

export type PageEditorSay = (key: string, values?: Readonly<Record<string, string>>) => string;
