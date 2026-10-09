import { afterEach, describe, expect, it } from 'bun:test';
import { copyTextToClipboard } from '@/shared/lib/clipboard.lib';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

/** Le da al navegador de la prueba un portapapeles que responde como se le diga, o lo deja sin ninguno. */
const giveClipboard = (writeText: ((text: string) => Promise<void>) | null): void => {
  const clipboard = writeText === null ? undefined : { writeText };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
};

describe('copyTextToClipboard', () => {
  afterEach(() => {
    if (originalClipboard === undefined) Reflect.deleteProperty(navigator, 'clipboard');
    else Object.defineProperty(navigator, 'clipboard', originalClipboard);
  });

  it('says the text got there when the browser copies it', async () => {
    const written: string[] = [];
    giveClipboard((text) => {
      written.push(text);
      return Promise.resolve();
    });

    expect(await copyTextToClipboard('cbk_secret')).toBe(true);
    expect(written).toEqual(['cbk_secret']);
  });

  it('says it did not when the browser refuses', async () => {
    giveClipboard(() => Promise.reject(new Error('Not allowed')));

    expect(await copyTextToClipboard('cbk_secret')).toBe(false);
  });

  /** Una página abierta sin HTTPS no tiene portapapeles: antes, el botón no hacía nada y no decía nada. */
  it('says it did not, without throwing, on a page with no clipboard at all', async () => {
    giveClipboard(null);

    expect(await copyTextToClipboard('cbk_secret')).toBe(false);
  });
});
