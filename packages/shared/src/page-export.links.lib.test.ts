import { describe, expect, it } from 'bun:test';
import { pathBetweenExportedFiles, pointAtExportedFiles } from './page-export.links.lib.js';

describe('pathBetweenExportedFiles', () => {
  it('reaches a sister without leaving the folder', () => {
    expect(pathBetweenExportedFiles('Madre/Una.md', 'Madre/Otra.md')).toBe('Otra.md');
  });

  it('climbs out to reach something above', () => {
    expect(pathBetweenExportedFiles('Madre/Hija/Nieta.md', 'Madre.md')).toBe('../../Madre.md');
  });

  it('goes down to reach something below', () => {
    expect(pathBetweenExportedFiles('Madre.md', 'Madre/Hija.md')).toBe('Madre/Hija.md');
  });

  it('spells a space the way an address has to', () => {
    expect(pathBetweenExportedFiles('Uno.md', 'Dos tres.md')).toBe('Dos%20tres.md');
  });
});

describe('pointAtExportedFiles', () => {
  const whereEachPageWent = new Map([
    ['page-a', 'Madre.md'],
    ['page-b', 'Madre/Hija.md'],
  ]);

  it('sends a mention to the file the page became', () => {
    const written = '[Manual](/spaces/space-1/pages/page-a) y algo más';

    expect(pointAtExportedFiles(written, 'Madre/Hija.md', whereEachPageWent, new Map())).toBe(
      '[Manual](../Madre.md) y algo más',
    );
  });

  it('leaves a mention to a page that did not come along exactly as it was', () => {
    const written = '[Otra](/spaces/space-1/pages/page-z)';

    expect(pointAtExportedFiles(written, 'Madre.md', whereEachPageWent, new Map())).toBe(
      '[Otra](/spaces/space-1/pages/page-z)',
    );
  });

  it('sends a picture to the file that travelled with it', () => {
    const assetId = '019ffd48-106b-76bb-85c8-cacd3b62ba79';
    const written = `![foto.png](${assetId})`;
    const whereEachAssetWent = new Map([[assetId, `assets/${assetId}.png`]]);

    expect(pointAtExportedFiles(written, 'Madre/Hija.md', whereEachPageWent, whereEachAssetWent)).toBe(
      `![foto.png](../assets/${assetId}.png)`,
    );
  });

  it('tells a file block where its file landed, without losing the identifier it had', () => {
    const assetId = '019ffd4f-6d91-726b-bbe1-cbdd206ec216';
    const written = `:::file{assetId="${assetId}" name="informe.txt"}\n:::`;
    const whereEachAssetWent = new Map([[assetId, `assets/${assetId}-informe.txt`]]);

    expect(pointAtExportedFiles(written, 'Madre.md', whereEachPageWent, whereEachAssetWent)).toBe(
      `:::file{assetId="${assetId}" name="informe.txt" path="assets/${assetId}-informe.txt"}\n:::`,
    );
  });

  it('leaves a file block alone when its file stayed behind', () => {
    const written = ':::file{assetId="019ffd4f-6d91-726b-bbe1-cbdd206ec216"}\n:::';

    expect(pointAtExportedFiles(written, 'Madre.md', whereEachPageWent, new Map())).toBe(written);
  });

  it('leaves alone something that only looks like an identifier', () => {
    const written = '[ver](algo-corto)';

    expect(pointAtExportedFiles(written, 'Madre.md', whereEachPageWent, new Map())).toBe(written);
  });

  it('leaves alone a link that was already pointing out at the world', () => {
    const written = '[la doc](https://ejemplo.com/docs)';

    expect(pointAtExportedFiles(written, 'Madre.md', whereEachPageWent, new Map())).toBe(written);
  });
});
