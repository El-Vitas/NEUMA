import { createContext } from 'react';
import type { PageCardAppearance } from '../types/pages.card-appearance.types';

/** Context rather than props: cards are drawn by galleries, boards and the "load more" of each, far from the view. */
export const PAGE_CARD_APPEARANCE_CONTEXT = createContext<PageCardAppearance>({ coverProperty: null, size: 'MEDIUM' });
