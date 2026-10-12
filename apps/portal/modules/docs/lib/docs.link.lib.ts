import { DOCS_LINK_OUTSIDE } from '../constants/docs.reading.constants';

export const isLinkOutside = (href: string | undefined): boolean => DOCS_LINK_OUTSIDE.test(href ?? '');
