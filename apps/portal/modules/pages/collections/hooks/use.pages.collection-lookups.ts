'use client';

import { useContext } from 'react';
import { PAGE_COLLECTION_LOOKUPS_CONTEXT } from '../constants/pages.lookups.context.constants';
import type { PageCollectionLookups } from '../types/pages.lookups.types';

export const usePagesCollectionLookups = (): PageCollectionLookups => useContext(PAGE_COLLECTION_LOOKUPS_CONTEXT);
