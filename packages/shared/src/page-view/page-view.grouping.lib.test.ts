import { describe, expect, test } from 'bun:test';
import { readPageDateBucketKey } from './page-view.grouping.lib.js';
import { PAGE_DATE_BUCKET } from './page-view.types.js';

describe('date buckets', () => {
  test('a day is the date itself', () => {
    expect(readPageDateBucketKey('2026-08-14', PAGE_DATE_BUCKET.DAY)).toBe('2026-08-14');
  });

  test('keeps only the date of something that also says the time', () => {
    expect(readPageDateBucketKey('2026-08-14T09:30:00.000Z', PAGE_DATE_BUCKET.DAY)).toBe('2026-08-14');
  });

  test('a week is the monday it starts on', () => {
    expect(readPageDateBucketKey('2026-08-14', PAGE_DATE_BUCKET.WEEK)).toBe('2026-08-10');
    expect(readPageDateBucketKey('2026-08-10', PAGE_DATE_BUCKET.WEEK)).toBe('2026-08-10');
  });

  test('a sunday belongs to the week that started six days earlier', () => {
    expect(readPageDateBucketKey('2026-08-16', PAGE_DATE_BUCKET.WEEK)).toBe('2026-08-10');
  });

  test('a month is the year and the month', () => {
    expect(readPageDateBucketKey('2026-08-14', PAGE_DATE_BUCKET.MONTH)).toBe('2026-08');
  });

  test('a week that started in the previous month keeps the day it started on', () => {
    expect(readPageDateBucketKey('2026-09-01', PAGE_DATE_BUCKET.WEEK)).toBe('2026-08-31');
  });

  test('nothing that is not a date names a bucket', () => {
    expect(readPageDateBucketKey('', PAGE_DATE_BUCKET.DAY)).toBeNull();
    expect(readPageDateBucketKey('mañana', PAGE_DATE_BUCKET.DAY)).toBeNull();
    expect(readPageDateBucketKey('2026-13-40', PAGE_DATE_BUCKET.MONTH)).toBeNull();
  });
});
