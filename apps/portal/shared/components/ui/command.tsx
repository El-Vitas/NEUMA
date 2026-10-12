'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import type * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const Command = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) => {
  return (
    <CommandPrimitive
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-none bg-popover text-popover-foreground',
        className,
      )}
      data-slot="command"
      {...props}
    />
  );
};

const CommandDialog = ({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
}) => {
  return (
    <Dialog {...props}>
      <DialogContent className={cn('overflow-hidden p-0', className)} showCloseButton={showCloseButton}>
        {/* Must sit inside the content: that is the element the dialog name is tied to. */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-item]_svg]:size-5 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group]]:px-2 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3"
          label={title}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) => {
  return (
    <div className="flex h-9 items-center gap-2 border-b px-3" data-slot="command-input-wrapper">
      <SearchIcon aria-hidden="true" className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn(
          'flex h-10 w-full rounded-none bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        data-slot="command-input"
        {...props}
      />
    </div>
  );
};

const CommandList = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) => {
  return (
    <CommandPrimitive.List
      className={cn('max-h-75 scroll-py-1 overflow-y-auto overflow-x-hidden', className)}
      data-slot="command-list"
      {...props}
    />
  );
};

const CommandEmpty = ({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) => {
  return <CommandPrimitive.Empty className="py-6 text-center text-sm" data-slot="command-empty" {...props} />;
};

const CommandGroup = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) => {
  return (
    <CommandPrimitive.Group
      className={cn(
        'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:text-xs',
        className,
      )}
      data-slot="command-group"
      {...props}
    />
  );
};

const CommandSeparator = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) => {
  return (
    <CommandPrimitive.Separator
      className={cn('-mx-1 h-px bg-border', className)}
      data-slot="command-separator"
      {...props}
    />
  );
};

const CommandItem = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) => {
  return (
    <CommandPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-none px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="command-item"
      {...props}
    />
  );
};

const CommandShortcut = ({ className, ...props }: React.ComponentProps<'span'>) => {
  return (
    <span
      className={cn('ml-auto text-muted-foreground text-xs tracking-widest', className)}
      data-slot="command-shortcut"
      {...props}
    />
  );
};

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
