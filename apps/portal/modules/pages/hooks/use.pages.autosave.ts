'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import type { PagesAutosaveOptions, PagesAutosaveResult, PagesAutosaveStatus } from '../types/pages.autosave.types';

export const usePagesAutosave = ({ enabled, onSave }: PagesAutosaveOptions): PagesAutosaveResult => {
  const [status, setStatus] = useState<PagesAutosaveStatus>('idle');
  const enabledRef = useRef(enabled);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const revisionRef = useRef(0);
  const saveCurrentRevisionRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback((): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isMountedRef.current && !isSavingRef.current) setStatus('idle');
  }, []);

  const schedule = useCallback(
    (isReadyToSave = true): void => {
      if (!enabledRef.current || !isReadyToSave) {
        cancel();
        return;
      }
      revisionRef.current += 1;
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void saveCurrentRevisionRef.current();
      }, DEFAULT_DEBOUNCE_MS);
    },
    [cancel],
  );

  const saveCurrentRevision = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current || isSavingRef.current) return false;

    const revision = revisionRef.current;
    isSavingRef.current = true;
    if (isMountedRef.current) setStatus('saving');

    let didSave = false;
    try {
      didSave = await onSaveRef.current();
    } catch {
      didSave = false;
    }
    isSavingRef.current = false;
    if (!isMountedRef.current) return didSave;

    if (didSave) {
      setStatus('saved');
    } else {
      setStatus('error');
    }

    if (revisionRef.current > revision && enabledRef.current) {
      schedule();
    }

    return didSave;
  }, [schedule]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current || isSavingRef.current) return false;
    cancel();
    return saveCurrentRevision();
  }, [cancel, saveCurrentRevision]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) cancel();
  }, [cancel, enabled]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    saveCurrentRevisionRef.current = saveCurrentRevision;
  }, [saveCurrentRevision]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      cancel();
    },
    [cancel],
  );

  return {
    cancel,
    hasError: status === 'error',
    hasSaved: status === 'saved',
    isSaving: status === 'saving',
    saveNow,
    schedule,
  };
};
