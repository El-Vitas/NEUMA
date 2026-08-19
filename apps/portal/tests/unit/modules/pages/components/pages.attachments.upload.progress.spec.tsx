import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PagesAttachmentsUploadProgress } from '@/modules/pages/components/pages.attachments.upload.progress';
import en from '../../../../../messages/en.json';

describe('PagesAttachmentsUploadProgress', () => {
  it('announces that the upload is in progress without inventing a percentage', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesAttachmentsUploadProgress />
      </NextIntlClientProvider>,
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Uploading...');
  });
});
