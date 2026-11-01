import { describe, expect, it } from 'bun:test';
import { buildContentSecurityPolicy } from '@/shared/lib/content-security-policy.lib';

const directivesOf = (policy: string): Map<string, string> =>
  new Map(
    policy.split('; ').map((directive) => {
      const [name = '', ...sources] = directive.split(' ');
      return [name, sources.join(' ')];
    }),
  );

const production = (frameAncestors = "'none'") =>
  directivesOf(
    buildContentSecurityPolicy({
      collaborationUrl: 'wss://neuma.example/api/v1/collaboration',
      frameAncestors,
      isDevelopment: false,
    }),
  );

describe('buildContentSecurityPolicy', () => {
  it('lets the page open its live-editing socket and nothing else outside its origin', () => {
    expect(production().get('connect-src')).toBe("'self' wss://neuma.example");
  });

  it('never allows eval in production, only in the dev server', () => {
    expect(production().get('script-src')).not.toContain('unsafe-eval');
    const development = directivesOf(
      buildContentSecurityPolicy({
        collaborationUrl: 'ws://localhost:3000/api/v1/collaboration',
        frameAncestors: "'none'",
        isDevelopment: true,
      }),
    );
    expect(development.get('script-src')).toContain("'unsafe-eval'");
  });

  it('frames only the embed players the editor offers', () => {
    const frameSources = production().get('frame-src') ?? '';

    expect(frameSources).toContain('https://www.youtube.com');
    expect(frameSources).toContain('https://www.figma.com');
    expect(frameSources).not.toContain('*');
  });

  it('blocks plugins and keeps base and forms on the origin', () => {
    const policy = production();

    expect(policy.get('object-src')).toBe("'none'");
    expect(policy.get('base-uri')).toBe("'self'");
    expect(policy.get('form-action')).toBe("'self'");
  });

  it('takes who may frame the page from the caller', () => {
    expect(production().get('frame-ancestors')).toBe("'none'");
    expect(production("'self'").get('frame-ancestors')).toBe("'self'");
  });
});
