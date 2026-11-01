'use client';

import { useContext } from 'react';
import { RECENTS_OWNER_CONTEXT } from '../constants/recents-owner.context.constants';

export const useRecentsOwner = (): string | null => useContext(RECENTS_OWNER_CONTEXT);
