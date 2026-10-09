import { describe, expect, it } from 'bun:test';
import { describePageFile, describePageFileSize } from '@/modules/pages/editor/media/lib/pages.editor.file.lib';

describe('how heavy a file is said to be', () => {
  it('counts bytes whole, since half a byte says nothing', () => {
    expect(describePageFileSize(0)).toBe('0 B');
    expect(describePageFileSize(53)).toBe('53 B');
  });

  it('climbs to the largest unit that leaves a number a person can hold', () => {
    expect(describePageFileSize(1024)).toBe('1.0 KB');
    expect(describePageFileSize(1_258_291)).toBe('1.2 MB');
    expect(describePageFileSize(3_221_225_472)).toBe('3.0 GB');
  });
});

describe('the line beside a file', () => {
  it('says what kind it is and how heavy, in the words people use for it', () => {
    expect(describePageFile('manual.pdf', 'application/pdf', 4096)).toBe('PDF · 4.0 KB');
    expect(describePageFile('informe.txt', 'text/plain', 53)).toBe('TXT · 53 B');
  });

  it('falls back to the type it was sent as when the name says nothing', () => {
    expect(describePageFile('informe', 'application/pdf', 53)).toBe('PDF · 53 B');
  });

  it('says only what it knows', () => {
    expect(describePageFile(null, null, 4096)).toBe('4.0 KB');
    expect(describePageFile('notas.txt', null, null)).toBe('TXT');
    expect(describePageFile(null, null, null)).toBe('');
  });
});
