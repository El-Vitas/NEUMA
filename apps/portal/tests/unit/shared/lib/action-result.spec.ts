import { describe, expect, it } from 'bun:test';
import { callAction, readActionFailureReason } from '@/shared/lib/action-result';

describe('callAction', () => {
  it('hands back what the action answered', async () => {
    expect(await callAction(() => Promise.resolve({ data: { id: 'a' } }))).toEqual({ data: { id: 'a' } });
    expect(await callAction(() => Promise.resolve({ serverError: 'forbidden' }))).toEqual({ serverError: 'forbidden' });
  });

  /**
   * Una acción que no llega al servidor —sin red, mientras se publica una
   * versión nueva— no responde: se rechaza. Se contesta como sin conexión, en
   * vez de dejar que la pantalla entera se caiga.
   */
  it('answers as offline when the call never reached the server', async () => {
    const answer = await callAction(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(readActionFailureReason(answer)).toBe('offline');
  });
});
