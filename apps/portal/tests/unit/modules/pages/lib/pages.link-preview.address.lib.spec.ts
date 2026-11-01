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

  it('refuses addresses written the IPv6 way that lead to private machines', () => {
    expect(isReachableLinkPreviewAddress('https://[::ffff:127.0.0.1]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[::ffff:7f00:1]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[fd00::1]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[fe80::1]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[::]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[64:ff9b::7f00:1]/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://[2002:7f00:1::]/')).toBe(false);
  });

  it('lets a public IPv6 address through', () => {
    expect(isReachableLinkPreviewAddress('https://[2606:4700:4700::1111]/')).toBe(true);
  });

  it('refuses reserved IPv4 ranges and the names that hide them', () => {
    expect(isReachableLinkPreviewAddress('https://192.0.0.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://198.18.0.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://224.0.0.1/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://localhost./')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://backend/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://postgres:5432/')).toBe(false);
  });

  it('refuses ports other than the secure one', () => {
    expect(isReachableLinkPreviewAddress('https://ejemplo.com:8443/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://ejemplo.com:443/')).toBe(true);
  });

  it('refuses names that only resolve inside', () => {
    expect(isReachableLinkPreviewAddress('https://backend.internal/')).toBe(false);
    expect(isReachableLinkPreviewAddress('https://db.localhost/')).toBe(false);
  });
});
