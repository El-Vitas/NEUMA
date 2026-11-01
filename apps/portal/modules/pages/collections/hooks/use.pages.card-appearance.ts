'use client';

import { useContext } from 'react';
import { PAGE_CARD_APPEARANCE_CONTEXT } from '../constants/pages.card-appearance.context.constants';
import type { PageCardAppearance } from '../types/pages.card-appearance.types';

export const usePagesCardAppearance = (): PageCardAppearance => useContext(PAGE_CARD_APPEARANCE_CONTEXT);
