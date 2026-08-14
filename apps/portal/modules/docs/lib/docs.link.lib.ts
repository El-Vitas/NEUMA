import { DOCS_LINK_OUTSIDE } from '../constants/docs.reading.constants';

/** Whether a link leads out of the workspace, which is what decides where it opens. */
export const isLinkOutside = (href: string | undefined): boolean => DOCS_LINK_OUTSIDE.test(href ?? '');
