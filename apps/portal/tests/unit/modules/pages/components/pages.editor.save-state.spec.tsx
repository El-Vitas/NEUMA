import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesEditorSaveState } from '@/modules/pages/editor/components/pages.editor.save-state';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import en from '../../../../../messages/en.json';

describe('PagesEditorSaveState', () => {
  it('renders nothing while there is nothing to report', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="idle" savedAt={null} />
      </NextIntlClientProvider>,
    );

    expect(container.textContent).toBe('');
  });

  it('says it is saving', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="saving" savedAt={null} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('Saving…');
  });

  it('says when it finished saving, with the time', () => {
    const savedAt = new Date('2026-08-15T14:32:00Z');
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="saved" savedAt={savedAt} />
      </NextIntlClientProvider>,
    );

    const expectedTime = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_TIME_ZONE,
    }).format(savedAt);
    expect(screen.getByRole('status').textContent).toBe(`Saved at ${expectedTime}`);
  });

  it('says there are unsaved changes waiting to be sent', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="pending" savedAt={null} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('There are unsaved changes');
  });

  it('explains the connection is gone and what will happen', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="offline" savedAt={null} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe(
      'No connection. What you write is saved as soon as it comes back.',
    );
  });

  it('says the connection is back and pending changes are being sent', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="backOnline" savedAt={null} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('The connection is back: what was pending is being saved.');
  });

  it('never shows a bare failure, always with what to do about it', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
        <PagesEditorSaveState displayState="failed" savedAt={null} />
      </NextIntlClientProvider>,
    );

    const status = screen.getByRole('status');
    expect(status.textContent).toBe(
      'This could not be saved. It keeps retrying; if it goes on, copy what you wrote before closing.',
    );
    expect(status.className).toContain('text-destructive');
  });
});
