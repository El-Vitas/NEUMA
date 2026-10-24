import { PAGE_PROPERTY_TYPE } from '@neuma/shared';

/** Cells whose change is what enters and leaves a list: only the server applies it without undoing another person. */
export const ONLINE_ONLY_CELL_TYPES: readonly string[] = [
  PAGE_PROPERTY_TYPE.FILES,
  PAGE_PROPERTY_TYPE.MULTI_SELECT,
  PAGE_PROPERTY_TYPE.PERSON,
  PAGE_PROPERTY_TYPE.RELATION,
];

/** The keyboard and the validation a phone or a browser offers follow the kind of text being typed. */
export const PAGE_TEXT_INPUT_TYPE_BY_PROPERTY_TYPE: Readonly<Record<string, 'email' | 'tel' | 'text' | 'url'>> = {
  [PAGE_PROPERTY_TYPE.EMAIL]: 'email',
  [PAGE_PROPERTY_TYPE.PHONE]: 'tel',
  [PAGE_PROPERTY_TYPE.URL]: 'url',
};
