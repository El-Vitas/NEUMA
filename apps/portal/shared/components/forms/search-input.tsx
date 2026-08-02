import { Search } from 'lucide-react';
import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  iconSize?: number;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  iconSize = 3.5,
  className,
  wrapperClassName,
  ref,
  ...props
}: SearchInputProps) => {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        style={{ width: iconSize, height: iconSize }}
      />
      <input
        className={cn(
          'h-9 w-full rounded-none border border-border bg-background pr-3 pl-9 text-foreground text-sm',
          'placeholder:text-muted-foreground',
          'focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
          className,
        )}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        ref={ref}
        type="search"
        value={value}
        {...props}
      />
    </div>
  );
};

SearchInput.displayName = 'SearchInput';

export type { SearchInputProps };
