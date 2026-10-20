import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_MODULE = join(process.cwd(), 'src/modules/pages');

const listSourceFiles = (): string[] =>
  readdirSync(PAGES_MODULE, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name));

/** What would read or write the table of the old model, or the document it kept in a column. */
const OLD_MODEL_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['the Page model of the ORM', /\bmodels\.Page\b|\borm\.public\.Page\b|\btables\.Page\b/],
  ['a Page table in raw SQL', /"Page"/],
  ['the content column of a page', /\bPage\.content\b/],
  ['the page blocks projection', /\bPageBlock\b|\bPageLink\b|\bSearchDocument\b/],
];

describe('the pages module', () => {
  const files = listSourceFiles();

  it('has sources to look at', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const [description, pattern] of OLD_MODEL_PATTERNS) {
    it(`never touches ${description}`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));

      expect(offenders).toEqual([]);
    });
  }

  it('no longer keeps the code that only served the document of a page', () => {
    const names = files.map((file) => file.slice(PAGES_MODULE.length));

    expect(names.filter((name) => name.includes('maintenance'))).toEqual([]);
  });
});
