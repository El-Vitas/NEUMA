import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/shared/components/ui/input';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  inputClassName?: string;
}

const FormField = ({ id, label, inputClassName, ...inputProps }: FormFieldProps) => {
  return (
    <div>
      <label className="mb-2 block text-sm text-status-muted" htmlFor={id}>
        {label}
      </label>
      <Input
        className={cn('h-12 border border-border bg-surface-container-low', inputClassName)}
        id={id}
        {...inputProps}
      />
    </div>
  );
};

export { FormField };
