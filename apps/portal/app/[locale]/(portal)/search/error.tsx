'use client';

import { SearchErrorState } from '@/modules/search/components/search.error-state';

interface IProps {
  readonly reset: () => void;
}

export default function SearchErrorBoundary({ reset }: IProps) {
  return <SearchErrorState onRetry={reset} />;
}
