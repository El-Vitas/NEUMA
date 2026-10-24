import { describe, expect, it } from 'bun:test';
import { readCardCoverFileId, readCardSizeColumns } from '@/modules/pages/collections/lib/pages.card-cover.lib';
import type { PageAttachedFile, PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const rowWith = (photos: unknown): PageRow => ({
  id: 'row-1',
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: photos === undefined ? {} : { photos: photos as string[] },
  spaceId: 'space-1',
  title: 'Una tarjeta',
});

const file = (id: string, mimeType: string): PageAttachedFile => ({ id, mimeType, name: id, size: 10 });

const files = [file('doc', 'application/pdf'), file('first', 'image/png'), file('second', 'image/webp')];

describe('la portada de una tarjeta', () => {
  it('is the first image of the files property the view names', () => {
    expect(readCardCoverFileId(rowWith(['first', 'second']), 'photos', files)).toBe('first');
  });

  it('skips what is not an image, however early it comes', () => {
    expect(readCardCoverFileId(rowWith(['doc', 'second']), 'photos', files)).toBe('second');
  });

  it('is nothing when the cell holds no image, or no cell at all', () => {
    expect(readCardCoverFileId(rowWith(['doc']), 'photos', files)).toBeNull();
    expect(readCardCoverFileId(rowWith([]), 'photos', files)).toBeNull();
    expect(readCardCoverFileId(rowWith(undefined), 'photos', files)).toBeNull();
  });

  it('is nothing when the files are not among the ones the server sent', () => {
    expect(readCardCoverFileId(rowWith(['lost']), 'photos', files)).toBeNull();
  });

  it('is nothing when the view names no property', () => {
    expect(readCardCoverFileId(rowWith(['first']), null, files)).toBeNull();
  });
});

describe('el tamaño de las tarjetas', () => {
  it('asks for more columns the smaller the card is', () => {
    expect(readCardSizeColumns('SMALL')).toContain('10rem');
    expect(readCardSizeColumns('MEDIUM')).toContain('15rem');
    expect(readCardSizeColumns('LARGE')).toContain('22rem');
  });
});
