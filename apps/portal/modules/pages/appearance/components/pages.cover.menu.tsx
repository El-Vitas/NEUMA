'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import type { PagesCoverController } from '../types/pages.cover.types';

interface IProps {
  readonly controller: PagesCoverController;
  readonly onDone: () => void;
}

export const PagesCoverMenu = ({ controller, onDone }: IProps) => {
  const t = useTranslations('pages.cover');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCover = controller.cover !== null;

  const chooseFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) return;
    controller.upload(file);
    onDone();
  };

  const actionClassName =
    'min-h-11 w-full px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

  return (
    <div className="flex flex-col">
      {/* The button is the control; this input only holds the native picker, hidden so it is not announced twice. */}
      <input
        accept="image/*"
        aria-hidden="true"
        className="sr-only"
        disabled={controller.isPending}
        onChange={chooseFile}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <button
        className={actionClassName}
        disabled={controller.isPending}
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        {hasCover ? t('change') : t('add')}
      </button>
      {hasCover && (
        <button
          className={actionClassName}
          disabled={controller.isPending}
          onClick={() => {
            controller.startReposition();
            onDone();
          }}
          type="button"
        >
          {t('reposition')}
        </button>
      )}
      {hasCover && (
        <button
          className={`${actionClassName} text-destructive`}
          disabled={controller.isPending}
          onClick={() => {
            controller.remove();
            onDone();
          }}
          type="button"
        >
          {t('remove')}
        </button>
      )}
    </div>
  );
};
