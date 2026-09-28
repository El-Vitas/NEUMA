'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';
import type {
  PagesAutosaveDisplayState,
  PagesAutosaveOptions,
  PagesAutosaveResult,
  PagesAutosaveStatus,
} from '../types/pages.autosave.types';

const isBrowserOnline = (): boolean => (typeof navigator === 'undefined' ? true : navigator.onLine);

const resolvePagesAutosaveDisplayState = ({
  hasUnsavedChanges,
  isOffline,
  isResumingAfterOffline,
  status,
}: {
  readonly hasUnsavedChanges: boolean;
  readonly isOffline: boolean;
  readonly isResumingAfterOffline: boolean;
  readonly status: PagesAutosaveStatus;
}): PagesAutosaveDisplayState => {
  if (isOffline) return 'offline';
  if (isResumingAfterOffline) return 'backOnline';
  if (status === 'saving') return 'saving';
  if (status === 'error') return 'failed';
  if (hasUnsavedChanges) return 'pending';
  if (status === 'saved') return 'saved';
  return 'idle';
};

export const usePagesAutosave = ({ enabled, onSave }: PagesAutosaveOptions): PagesAutosaveResult => {
  const [status, setStatus] = useState<PagesAutosaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isResumingAfterOffline, setIsResumingAfterOffline] = useState(false);

  const enabledRef = useRef(enabled);
  const isMountedRef = useRef(true);
  const isOfflineRef = useRef(isOffline);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const revisionRef = useRef(0);
  const hasUnsavedChangesRef = useRef(false);
  const isResumingAfterOfflineRef = useRef(false);
  const saveCurrentRevisionRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markUnsavedChanges = useCallback((nextHasUnsavedChanges: boolean): void => {
    hasUnsavedChangesRef.current = nextHasUnsavedChanges;
    if (isMountedRef.current) setHasUnsavedChanges(nextHasUnsavedChanges);
  }, []);

  const updateOfflineState = useCallback((nextIsOffline: boolean): void => {
    isOfflineRef.current = nextIsOffline;
    if (isMountedRef.current) setIsOffline(nextIsOffline);
  }, []);

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
      markUnsavedChanges(true);
      cancel();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void saveCurrentRevisionRef.current();
      }, DEFAULT_DEBOUNCE_MS);
    },
    [cancel, markUnsavedChanges],
  );

  const attemptSave = useCallback(async (): Promise<boolean> => {
    try {
      return await onSaveRef.current();
    } catch {
      return false;
    }
  }, []);

  const clearResumeAfterOfflineFlag = useCallback((): void => {
    isResumingAfterOfflineRef.current = false;
    if (isMountedRef.current) setIsResumingAfterOffline(false);
  }, []);

  const applySaveOutcome = useCallback(
    (didSave: boolean, revision: number): void => {
      if (!didSave) {
        setStatus('error');
        return;
      }
      setStatus('saved');
      setSavedAt(new Date());
      markUnsavedChanges(revisionRef.current !== revision);
    },
    [markUnsavedChanges],
  );

  const saveCurrentRevision = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current || isSavingRef.current || isOfflineRef.current) return false;

    const revision = revisionRef.current;
    const wasResumingAfterOffline = isResumingAfterOfflineRef.current;
    isSavingRef.current = true;
    if (isMountedRef.current) setStatus('saving');

    const didSave = await attemptSave();
    isSavingRef.current = false;
    if (wasResumingAfterOffline) clearResumeAfterOfflineFlag();
    if (!isMountedRef.current) return didSave;

    applySaveOutcome(didSave, revision);
    if (revisionRef.current > revision && enabledRef.current) schedule();

    return didSave;
  }, [applySaveOutcome, attemptSave, clearResumeAfterOfflineFlag, schedule]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current || isSavingRef.current) return false;
    cancel();
    return saveCurrentRevision();
  }, [cancel, saveCurrentRevision]);

  const triggerResumeAfterOffline = useCallback((): void => {
    if (!hasUnsavedChangesRef.current || isSavingRef.current) return;
    isResumingAfterOfflineRef.current = true;
    if (isMountedRef.current) setIsResumingAfterOffline(true);
    cancel();
    void saveCurrentRevisionRef.current();
  }, [cancel]);

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

  useEffect(() => {
    updateOfflineState(!isBrowserOnline());
    const handleOffline = (): void => updateOfflineState(true);
    const handleOnline = (): void => {
      updateOfflineState(false);
      triggerResumeAfterOffline();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [triggerResumeAfterOffline, updateOfflineState]);

  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  /** Mounted again after being taken down, as React does in development, it is mounted: a save that ends now still counts. */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return {
    cancel,
    displayState: resolvePagesAutosaveDisplayState({
      hasUnsavedChanges,
      isOffline,
      isResumingAfterOffline,
      status,
    }),
    hasError: status === 'error',
    hasSaved: status === 'saved',
    hasUnsavedChanges,
    isSaving: status === 'saving',
    savedAt,
    saveNow,
    schedule,
  };
};
