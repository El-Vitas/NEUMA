import { describe, expect, it } from 'bun:test';
import { readTextUpToLimit } from '@/modules/pages/links/lib/pages.link-preview.body.lib';
import { resolvePublicAddresses } from '@/modules/pages/links/lib/pages.link-preview.lookup.lib';

const encoder = new TextEncoder();

describe('readTextUpToLimit', () => {
  it('reads a small body whole', async () => {
    const source = (async function* () {
      yield encoder.encode('hola ');
      yield encoder.encode('mundo');
    })();

    expect(await readTextUpToLimit(source, 100)).toBe('hola mundo');
  });

  it('stops pulling from an endless source once the limit is reached', async () => {
    let pulled = 0;
    const endless = (async function* () {
      while (true) {
        pulled += 1;
        yield encoder.encode('abcd');
      }
    })();

    const text = await readTextUpToLimit(endless, 10);

    expect(text).toBe('abcdabcdab');
    expect(pulled).toBe(3);
  });
});

describe('resolvePublicAddresses', () => {
  it('passes a name that resolves only to public addresses', async () => {
    const resolved = await resolvePublicAddresses('ejemplo.com', async () => [{ address: '93.184.216.34', family: 4 }]);

    expect(resolved).toEqual([{ address: '93.184.216.34', family: 4 }]);
  });

  it('refuses a name when any of its addresses is private', async () => {
    const resolve = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ];

    await expect(resolvePublicAddresses('ejemplo.com', resolve)).rejects.toThrow('non-public');
  });

  it('refuses a name that resolves to a mapped loopback', async () => {
    const resolve = async () => [{ address: '::ffff:127.0.0.1', family: 6 }];

    await expect(resolvePublicAddresses('ejemplo.com', resolve)).rejects.toThrow('non-public');
  });

  it('refuses a name that resolves to nothing', async () => {
    await expect(resolvePublicAddresses('ejemplo.com', async () => [])).rejects.toThrow('no address');
  });
});
