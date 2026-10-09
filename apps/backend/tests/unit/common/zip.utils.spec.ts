import { describe, expect, it } from 'bun:test';
import { buildZipArchive } from '@/common/utils/zip.utils';

/** Reads the archive back with a real unzip. `-O UTF-8` because Info-ZIP on Linux ignores the UTF-8 name flag. */
const readBack = async (bytes: Uint8Array): Promise<Record<string, string>> => {
  const workingDirectory = `/tmp/zip-spec-${String(bytes.byteLength)}-${String(bytes[20] ?? 0)}`;
  await Bun.$`rm -rf ${workingDirectory}`.quiet();
  await Bun.$`mkdir -p ${workingDirectory}`.quiet();
  await Bun.write(`${workingDirectory}/archive.zip`, bytes);
  await Bun.$`unzip -qq -O UTF-8 -o archive.zip`.cwd(workingDirectory).quiet();
  const listed = await Bun.$`find . -type f -not -name archive.zip`.cwd(workingDirectory).text();
  const read: Record<string, string> = {};
  for (const line of listed.trim().split('\n')) {
    const name = line.replace(/^\.\//, '');
    read[name] = await Bun.file(`${workingDirectory}/${name}`).text();
  }
  await Bun.$`rm -rf ${workingDirectory}`.quiet();
  return read;
};

describe('buildZipArchive', () => {
  it('holds one file, readable by an ordinary unzip', async () => {
    const archive = await buildZipArchive([{ contents: 'Hola mundo', path: 'saludo.md' }]);

    expect(await readBack(archive)).toEqual({ 'saludo.md': 'Hola mundo' });
  });

  it('keeps folders, which is how a hierarchy is said without inventing syntax', async () => {
    const archive = await buildZipArchive([
      { contents: '# Madre', path: 'Madre.md' },
      { contents: '# Hija', path: 'Madre/Hija.md' },
      { contents: '# Nieta', path: 'Madre/Hija/Nieta.md' },
    ]);

    expect(await readBack(archive)).toEqual({
      'Madre.md': '# Madre',
      'Madre/Hija.md': '# Hija',
      'Madre/Hija/Nieta.md': '# Nieta',
    });
  });

  it('carries accents and emoji through unharmed', async () => {
    const archive = await buildZipArchive([{ contents: 'año 🎉 señor', path: 'Diseño ñ.md' }]);

    expect(await readBack(archive)).toEqual({ 'Diseño ñ.md': 'año 🎉 señor' });
  });

  it('holds a page long enough that compressing it actually matters', async () => {
    const long = 'Párrafo de relleno que se repite.\n'.repeat(2000);
    const archive = await buildZipArchive([{ contents: long, path: 'larga.md' }]);

    expect(archive.byteLength).toBeLessThan(long.length / 2);
    expect((await readBack(archive))['larga.md']).toBe(long);
  });
});
