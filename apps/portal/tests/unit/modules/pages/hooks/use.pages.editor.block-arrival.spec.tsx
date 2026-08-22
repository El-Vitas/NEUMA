import { describe, expect, it, mock } from 'bun:test';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createRef, type RefObject } from 'react';
import en from '../../../../../messages/en.json';

const errors: string[] = [];

mock.module('sonner', () => ({
  toast: {
    error: (message: string) => errors.push(message),
    success: () => undefined,
  },
}));

const { usePagesEditorBlockArrival } = await import(
  '@/modules/pages/editor/blocks/hooks/use.pages.editor.block-arrival'
);

const Page = ({
  hostRef,
  standing,
}: {
  readonly hostRef: RefObject<HTMLDivElement | null>;
  readonly standing: string;
}) => {
  usePagesEditorBlockArrival(hostRef);
  return (
    <div ref={hostRef}>
      <p data-block-id={standing}>Uno</p>
    </div>
  );
};

/** Opens the page asking for one block while another is the one standing there. */
const openPageAsking = (wanted: string, standing: string): void => {
  window.location.hash = `#${wanted}`;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Page hostRef={createRef<HTMLDivElement>()} standing={standing} />
    </NextIntlClientProvider>,
  );
};

const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('arriving at a page with a block in the address', () => {
  it('says nothing while the block is there', async () => {
    errors.length = 0;
    openPageAsking('block-1', 'block-1');

    await waitFor(200);

    expect(errors).toEqual([]);
  });

  it('says the block is gone once the page has had its time', async () => {
    errors.length = 0;
    openPageAsking('block-9', 'block-1');

    await waitFor(6000);

    expect(errors).toEqual(['That block is no longer on the page']);
  });
});

describe('following a link to a block on the page one is already reading', () => {
  it('answers the new address, not only the one the page was opened with', async () => {
    errors.length = 0;
    openPageAsking('block-1', 'block-1');

    window.location.hash = '#block-9';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(6000);

    expect(errors).toEqual(['That block is no longer on the page']);
  });
});
