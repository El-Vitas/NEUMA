import { Skeleton } from '@/shared/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="space-y-6 p-4 sm:p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
