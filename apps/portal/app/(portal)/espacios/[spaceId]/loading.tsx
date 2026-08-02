import { Skeleton } from '@/shared/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[280px_1fr]">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
