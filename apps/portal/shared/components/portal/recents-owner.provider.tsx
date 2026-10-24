'use client';

import type { ReactNode } from 'react';
import { RECENTS_OWNER_CONTEXT } from '@/shared/constants/recents-owner.context.constants';

interface IProps {
  readonly children: ReactNode;
  readonly userId: string;
}

export const RecentsOwnerProvider = ({ children, userId }: IProps) => (
  <RECENTS_OWNER_CONTEXT value={userId}>{children}</RECENTS_OWNER_CONTEXT>
);
