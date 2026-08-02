import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  ref?: Ref<ComponentRef<typeof CheckboxPrimitive.Root>>;
};

const Checkbox = ({ className, ref, ...props }: CheckboxProps) => (
  <CheckboxPrimitive.Root
    className={cn(
      'peer size-4 shrink-0 rounded-none border border-foreground/30 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-foreground data-[state=indeterminate]:border-foreground data-[state=checked]:bg-foreground data-[state=indeterminate]:bg-foreground data-[state=checked]:text-background data-[state=indeterminate]:text-background',
      className,
    )}
    ref={ref}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      <CheckIcon className="size-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
