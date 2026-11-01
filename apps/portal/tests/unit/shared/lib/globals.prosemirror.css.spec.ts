import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const stylesheet = readFileSync(resolve(import.meta.dir, '../../../../globals.css'), 'utf8');

const readRuleBody = (selector: string): string => {
  const start = stylesheet.indexOf(`${selector} {`);
  return start === -1 ? '' : stylesheet.slice(start, stylesheet.indexOf('}', start));
};

describe('the editor surface style', () => {
  it('keeps the white space of what is written, which ProseMirror needs to read the text it shows', () => {
    expect(readRuleBody('.ProseMirror')).toMatch(/white-space:\s*pre-wrap/);
  });
});
