import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IProps {
  readonly message?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

const EmptyState = ({ message, action, className }: IProps) => {
  return (
    <div
      className={cn(
        'flex h-full min-h-64 flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground text-sm',
        className,
      )}
    >
      <p>{message}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};

export { EmptyState };
