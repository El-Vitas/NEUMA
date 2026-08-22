import { describe, expect, it } from 'bun:test';
import { isReachableLinkPreviewAddress } from '@/modules/pages/links/lib/pages.link-preview.address.lib';

describe('isReachableLinkPreviewAddress', () => {
  it('lets an ordinary site be asked', () => {
    expect(isReachableLinkPreviewAddress('https://ejemplo.com/articulo')).toBe(true);
    expect(isReachableLinkPreviewAddress('https://www.anthropic.com')).toBe(true);
  });

  it('refuses anything that is not a safe connection', () => {
    expect(isReachableLinkPreviewAddress('http://ejemplo.com')).toBe(false);
    expect(isReachableLinkPreviewAddress('file:///etc/passwd')).toBe(false);
    expect(isReachableLinkPreviewAddress('no es una direccion')).toBe(false);
  });

  it('refuses the machine that is asking', () => {
    expect(isReachableLinkPreviewAddress('https://localhost/admin')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://127.0.0.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[::1]/')).toBe(false);
  });

  it('refuses the network the machine lives in', () => {
    expect(isReachableLinkPreviewAddress('https://10.0.0.5/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://192.168.1.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://172.16.0.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://172.31.255.254/')).toBe(false);
  });

  it('lets through an address that only looks private', () => {
    expect(isReachableLinkPreviewAddress('https://172.32.0.1/')).toBe(true);
    expect(isReachableLinkPreviewAddress('https://11.0.0.1/')).toBe(true);
  });

  it('refuses the address where a cloud keeps its credentials', () => {
    expect(isReachableLinkPreviewAddress('https://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('refuses names that only resolve inside', () => {
    expect(isReachableLinkPreviewAddress('https://backend.internal/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://db.localhost/')).toBe(false);
  });
});
