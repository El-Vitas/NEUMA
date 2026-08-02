import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ message = 'Sin resultados.', action, className }: EmptyStateProps) => {
  return (
    <td className={cn('px-4 py-16 text-center text-muted-foreground text-sm', className)} colSpan={999}>
      <p>{message}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </td>
  );
};

export type { EmptyStateProps };
export { EmptyState };
