'use client';

import { useRouter } from 'next/navigation';
import { SearchErrorState } from './search.error-state';

export const SearchRetry = () => {
  const router = useRouter();

  return <SearchErrorState onRetry={() => router.refresh()} />;
};
