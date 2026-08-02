'use client';

import { NuqsAdapter } from 'nuqs/adapters/next';

export const NuqsProvider = ({ children }: { readonly children: React.ReactNode }) => {
  return <NuqsAdapter>{children}</NuqsAdapter>;
};
