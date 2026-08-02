'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface IProps {
  readonly entityLabel: string;
  readonly description: React.ReactNode;
  readonly isPending: boolean;
  readonly onConfirm: () => void | Promise<void>;
}

export const DeleteEntityDialog = ({ entityLabel, description, isPending, onConfirm }: IProps) => {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-none border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-destructive text-xs hover:bg-destructive/20"
          type="button"
        >
          <Trash2 className="size-3" />
          {entityLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entityLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-none border border-border bg-background px-4 text-muted-foreground text-sm hover:text-foreground"
              type="button"
            >
              {t('cancel')}
            </button>
          </DialogClose>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-none bg-destructive px-4 font-semibold text-destructive-foreground text-sm hover:bg-destructive/90 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? t('deleting') : entityLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
