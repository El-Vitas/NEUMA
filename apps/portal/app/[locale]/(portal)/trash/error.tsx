'use client';

import { PagesTrashErrorState } from '@/modules/pages/components/pages.trash.error-state';

interface IProps {
  readonly reset: () => void;
}

export default function TrashErrorBoundary({ reset }: IProps) {
  return <PagesTrashErrorState onRetry={reset} />;
}
