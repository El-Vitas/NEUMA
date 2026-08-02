'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import type { UseTableActionOptions, UseTableActionResult } from '@/shared/types/use-table-action.types';

export const useTableAction = ({
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseTableActionOptions = {}): UseTableActionResult => {
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(
    (action: () => void) => {
      setIsNavigating(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setIsNavigating(false);
        startTransition(() => {
          action();
        });
      }, debounceMs);
    },
    [debounceMs],
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const isLoading = isNavigating || isPending;

  return {
    trigger,
    cancel,
    isLoading,
  };
};
