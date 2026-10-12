import { describe, expect, it } from 'bun:test';
import { buildPortalPageLink } from '@/shared/lib/page-link.lib';

describe('buildPortalPageLink', () => {
  it('builds the whole address of a page on the portal it is copied from', () => {
    expect(buildPortalPageLink('https://brain.example.com', 'space-1', 'page-1')).toBe(
      'https://brain.example.com/spaces/space-1/pages/page-1',
    );
  });

  it('leaves out the language, so whoever opens it reads the page in theirs', () => {
    expect(buildPortalPageLink('http://localhost:3010', 's', 'p')).not.toContain('/es/');
  });
});
