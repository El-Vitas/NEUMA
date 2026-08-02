import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IProps {
  readonly message: string;
  readonly className?: string;
}

export const FormErrorBanner = ({ message, className }: IProps) => (
  <div
    className={cn(
      'flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm',
      className,
    )}
    role="alert"
  >
    <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
    <span>{message}</span>
  </div>
);
