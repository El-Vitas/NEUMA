import { describe, expect, it } from 'bun:test';
import { readTemplateDraft } from '@/modules/pages/utils/page-template.utils';

describe('reading what a request says about a template', () => {
  it('keeps what was said and nothing else', () => {
    const draft = readTemplateDraft({ title: 'Weekly', variables: { due: '@today' } }).getValue();

    expect(draft).toEqual({ title: 'Weekly', variables: { due: '@today' } });
  });

  it('refuses a variable word this version does not know', () => {
    const draft = readTemplateDraft({ variables: { due: '@tomorrow' } });

    expect(draft.isFail()).toBe(true);
  });
});
