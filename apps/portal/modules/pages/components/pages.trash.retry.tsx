'use client';

import { useRouter } from 'next/navigation';
import { PagesTrashErrorState } from './pages.trash.error-state';

export const PagesTrashRetry = () => {
  const router = useRouter();

  return <PagesTrashErrorState onRetry={() => router.refresh()} />;
};
