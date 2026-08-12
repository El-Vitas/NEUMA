import { describe, expect, it } from 'bun:test';
import { applyThemeReading, readThemeChoice, resolveThemeReading } from '@/shared/lib/theme.lib';

describe('remembering how the interface should be read', () => {
  it('keeps a choice it recognises', () => {
    expect(readThemeChoice('dark')).toBe('dark');
    expect(readThemeChoice('light')).toBe('light');
    expect(readThemeChoice('system')).toBe('system');
  });

  it('follows the system when nothing was chosen, or when what was kept means nothing here', () => {
    expect(readThemeChoice(undefined)).toBe('system');
    expect(readThemeChoice('sepia')).toBe('system');
  });
});

describe('deciding how the page is read', () => {
  it('does what was asked for, whatever the system prefers', () => {
    expect(resolveThemeReading('dark', false)).toBe('dark');
    expect(resolveThemeReading('light', true)).toBe('light');
  });

  it('asks the system for those who chose neither', () => {
    expect(resolveThemeReading('system', true)).toBe('dark');
    expect(resolveThemeReading('system', false)).toBe('light');
  });
});

describe('dressing the page', () => {
  it('marks it as read at night, and unmarks it by day', () => {
    const root = document.createElement('html');

    applyThemeReading(root, 'dark');
    expect(root.classList.contains('dark')).toBe(true);

    applyThemeReading(root, 'light');
    expect(root.classList.contains('dark')).toBe(false);
  });
});
