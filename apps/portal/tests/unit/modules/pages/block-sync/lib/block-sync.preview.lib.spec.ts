import { describe, expect, it } from 'bun:test';
import { buildApplyTextOperation, buildSetOperation } from '@/modules/pages/block-sync/lib/block-sync.operations.lib';
import { describeTransactionText, readPlainText } from '@/modules/pages/block-sync/lib/block-sync.preview.lib';

const texts: Record<string, unknown> = {
  'b1:title': [{ insert: 'Hola ' }, { attributes: { bold: true }, insert: 'mundo' }],
  'b2:title': [{ insert: 'Segundo' }],
};
const readText = (blockId: string, property: string): unknown => texts[`${blockId}:${property}`];

describe('readPlainText', () => {
  it('joins the words and leaves the marks out', () => {
    expect(readPlainText(texts['b1:title'])).toBe('Hola mundo');
  });

  it('is empty for what is not a text', () => {
    expect(readPlainText(undefined)).toBe('');
    expect(readPlainText('plain')).toBe('');
  });
});

describe('describeTransactionText', () => {
  it('holds the words of every text the transaction writes, once each', () => {
    const operations = [
      buildApplyTextOperation('b1', 'title', 'x'),
      buildApplyTextOperation('b1', 'title', 'y'),
      buildApplyTextOperation('b2', 'title', 'z'),
    ];

    expect(describeTransactionText(operations, readText)).toEqual([
      { blockId: 'b1', property: 'title', text: 'Hola mundo' },
      { blockId: 'b2', property: 'title', text: 'Segundo' },
    ]);
  });

  it('holds nothing for a transaction that writes no text', () => {
    expect(describeTransactionText([buildSetOperation('b1', { id: 'b1' })], readText)).toEqual([]);
  });

  it('leaves out a text the editor no longer holds', () => {
    expect(describeTransactionText([buildApplyTextOperation('gone', 'title', 'x')], readText)).toEqual([]);
  });
});
