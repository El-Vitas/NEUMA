import type { PAGE_TEMPLATE_VARIABLE_VALUES } from './page-template.constants.js';

export type PageTemplateVariable = (typeof PAGE_TEMPLATE_VARIABLE_VALUES)[number];

/** Column key to the word that fills it when a row is made from the template. */
export type PageTemplateVariables = Readonly<Record<string, PageTemplateVariable>>;

/** What a template page stores under `properties.template`. */
export interface PageTemplateMarker {
  readonly variables: PageTemplateVariables;
}

/** Who makes the row, when, and where: what a variable needs to become a day or a person. */
export interface PageTemplateViewer {
  /** Milliseconds since the epoch. */
  readonly now: number;
  readonly timeZone: string;
  readonly viewerId: string;
}
