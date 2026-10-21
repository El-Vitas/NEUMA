import { PAGE_PROPERTY_TYPE } from '@neuma/shared';

/** The keyboard and the validation a phone or a browser offers follow the kind of text being typed. */
export const PAGE_TEXT_INPUT_TYPE_BY_PROPERTY_TYPE: Readonly<Record<string, 'email' | 'tel' | 'text' | 'url'>> = {
  [PAGE_PROPERTY_TYPE.EMAIL]: 'email',
  [PAGE_PROPERTY_TYPE.PHONE]: 'tel',
  [PAGE_PROPERTY_TYPE.URL]: 'url',
};
