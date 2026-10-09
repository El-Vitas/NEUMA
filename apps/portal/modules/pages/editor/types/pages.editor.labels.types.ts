import type { PageCollectionWording } from '../../collections/types/pages.collections.types';
import type { PageEditorNodeViewLabels } from '../blocks/types/pages.editor.node-views.types';

/** Everything the editor says that is not what somebody wrote, in the language of whoever reads it. */
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

/** How a label is asked for: by its key, with the values it names. */
export type PageEditorSay = (key: string, values?: Readonly<Record<string, string>>) => string;
