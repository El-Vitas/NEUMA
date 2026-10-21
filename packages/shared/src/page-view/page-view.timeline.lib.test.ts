import { describe, expect, test } from 'bun:test';
import {
  buildPageTimelineChange,
  layoutPageTimelineBar,
  listPageTimelineTicks,
  readPageTimelineOffset,
  readPageTimelinePeriod,
  readPageTimelineWindow,
  shiftPageTimelineAnchor,
} from './page-view.timeline.lib.js';

describe('the days a timeline opens on', () => {
  test('a day scale shows six weeks that start the week before the anchor, on a monday', () => {
    // 2026-09-16 is a Wednesday: its week starts on 2026-09-14, and one week earlier is 2026-09-07.
    expect(readPageTimelineWindow('DAY', '2026-09-16')).toEqual({ end: '2026-10-18', start: '2026-09-07' });
  });

  test('a week scale shows twenty-six weeks that start four weeks before the anchor week', () => {
    expect(readPageTimelineWindow('WEEK', '2026-09-16')).toEqual({ end: '2027-02-14', start: '2026-08-17' });
  });

  test('a month scale shows twelve whole months that start the month before the anchor', () => {
    expect(readPageTimelineWindow('MONTH', '2026-09-16')).toEqual({ end: '2027-07-31', start: '2026-08-01' });
  });

  test('moving on shifts the anchor by a bit less than a window, so the eye keeps some context', () => {
    expect(shiftPageTimelineAnchor('DAY', '2026-09-16', 1)).toBe('2026-10-14');
    expect(shiftPageTimelineAnchor('DAY', '2026-09-16', -1)).toBe('2026-08-19');
    expect(shiftPageTimelineAnchor('WEEK', '2026-09-16', 1)).toBe('2026-12-16');
    expect(shiftPageTimelineAnchor('MONTH', '2026-09-16', 1)).toBe('2027-03-16');
    expect(shiftPageTimelineAnchor('MONTH', '2026-03-31', -1)).toBe('2025-09-30');
  });
});

describe('the marks along the top', () => {
  test('a day scale has one mark per day', () => {
    const window = readPageTimelineWindow('DAY', '2026-09-16');
    const ticks = listPageTimelineTicks('DAY', window);

    expect(ticks).toHaveLength(42);
    expect(ticks[0]).toEqual({ day: '2026-09-07', offsetDays: 0, spanDays: 1 });
  });

  test('a week scale has one mark per monday, each one week wide', () => {
    const window = readPageTimelineWindow('WEEK', '2026-09-16');
    const ticks = listPageTimelineTicks('WEEK', window);

    expect(ticks).toHaveLength(26);
    expect(ticks[1]).toEqual({ day: '2026-08-24', offsetDays: 7, spanDays: 7 });
  });

  test('a month scale has one mark per month, as wide as the month is long', () => {
    const window = readPageTimelineWindow('MONTH', '2026-09-16');
    const ticks = listPageTimelineTicks('MONTH', window);

    expect(ticks).toHaveLength(12);
    expect(ticks[0]).toEqual({ day: '2026-08-01', offsetDays: 0, spanDays: 31 });
    expect(ticks[1]).toEqual({ day: '2026-09-01', offsetDays: 31, spanDays: 30 });
  });

  test('the marks cover the window without a gap', () => {
    const window = readPageTimelineWindow('MONTH', '2026-02-10');
    const ticks = listPageTimelineTicks('MONTH', window);
    const covered = ticks.reduce((total, tick) => total + tick.spanDays, 0);

    expect(covered).toBe(365);
  });
});

describe('where a row sits in time', () => {
  test('a date range is the days from its start to its end', () => {
    expect(readPageTimelinePeriod({ end: '2026-09-18', start: '2026-09-14' }, null)).toEqual({
      end: '2026-09-18',
      start: '2026-09-14',
    });
  });

  test('a single day lasts that day', () => {
    expect(readPageTimelinePeriod({ start: '2026-09-14' }, null)).toEqual({ end: '2026-09-14', start: '2026-09-14' });
  });

  test('the time of day does not change which day it is', () => {
    expect(readPageTimelinePeriod({ end: '2026-09-15T18:00:00Z', start: '2026-09-14T09:00:00Z' }, null)).toEqual({
      end: '2026-09-15',
      start: '2026-09-14',
    });
  });

  test('a row with its end in another property runs from the start to that end', () => {
    expect(readPageTimelinePeriod({ start: '2026-09-14' }, { start: '2026-09-20' })).toEqual({
      end: '2026-09-20',
      start: '2026-09-14',
    });
  });

  test('an end that falls before the start is read as the start day', () => {
    expect(readPageTimelinePeriod({ start: '2026-09-14' }, { start: '2026-09-10' })).toEqual({
      end: '2026-09-14',
      start: '2026-09-14',
    });
  });

  test('a row with no start has no place in time', () => {
    expect(readPageTimelinePeriod(null, { start: '2026-09-10' })).toBeNull();
    expect(readPageTimelinePeriod(null, null)).toBeNull();
  });
});

describe('the bar of a row', () => {
  const window = { end: '2026-09-30', start: '2026-09-01' };

  test('starts where the row starts and is as wide as the days it lasts', () => {
    expect(layoutPageTimelineBar({ end: '2026-09-05', start: '2026-09-03' }, window, 10)).toEqual({
      endsAfterWindow: false,
      left: 20,
      startsBeforeWindow: false,
      width: 30,
    });
  });

  test('is cut at the edge of the window and says it goes on', () => {
    expect(layoutPageTimelineBar({ end: '2026-10-10', start: '2026-09-28' }, window, 10)).toEqual({
      endsAfterWindow: true,
      left: 270,
      startsBeforeWindow: false,
      width: 30,
    });
    expect(layoutPageTimelineBar({ end: '2026-09-02', start: '2026-08-20' }, window, 10)).toEqual({
      endsAfterWindow: false,
      left: 0,
      startsBeforeWindow: true,
      width: 20,
    });
  });

  test('is nowhere when the row lies wholly outside the window', () => {
    expect(layoutPageTimelineBar({ end: '2026-08-31', start: '2026-08-20' }, window, 10)).toBeNull();
    expect(layoutPageTimelineBar({ end: '2026-10-20', start: '2026-10-01' }, window, 10)).toBeNull();
  });

  test('puts today on the line of its day', () => {
    expect(readPageTimelineOffset('2026-09-16', window, 10)).toBe(150);
    expect(readPageTimelineOffset('2026-08-30', window, 10)).toBeNull();
  });
});

describe('changing the dates of a row by dragging', () => {
  test('moving a single range moves both ends and keeps the length', () => {
    const change = buildPageTimelineChange({
      deltaDays: 3,
      endValue: null,
      mode: 'MOVE',
      endProperty: null,
      startProperty: 'when',
      startValue: { end: '2026-09-18', start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { end: '2026-09-21', start: '2026-09-17' } });
  });

  test('moving keeps the time of day of what was set', () => {
    const change = buildPageTimelineChange({
      deltaDays: -1,
      endValue: null,
      endProperty: null,
      mode: 'MOVE',
      startProperty: 'when',
      startValue: { end: '2026-09-15T18:00:00Z', start: '2026-09-14T09:00:00Z' },
    });

    expect(change).toEqual({ when: { end: '2026-09-14T18:00:00Z', start: '2026-09-13T09:00:00Z' } });
  });

  test('moving a single day moves that day', () => {
    const change = buildPageTimelineChange({
      deltaDays: 2,
      endValue: null,
      endProperty: null,
      mode: 'MOVE',
      startProperty: 'when',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { start: '2026-09-16' } });
  });

  test('stretching the end of a range moves only the end', () => {
    const change = buildPageTimelineChange({
      deltaDays: 4,
      endValue: null,
      endProperty: null,
      mode: 'RESIZE_END',
      startProperty: 'when',
      startValue: { end: '2026-09-18', start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { end: '2026-09-22', start: '2026-09-14' } });
  });

  test('stretching the end of a single day makes it a range', () => {
    const change = buildPageTimelineChange({
      deltaDays: 2,
      endValue: null,
      endProperty: null,
      mode: 'RESIZE_END',
      startProperty: 'when',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { end: '2026-09-16', start: '2026-09-14' } });
  });

  test('the end never goes before the start', () => {
    const change = buildPageTimelineChange({
      deltaDays: -9,
      endValue: null,
      endProperty: null,
      mode: 'RESIZE_END',
      startProperty: 'when',
      startValue: { end: '2026-09-18', start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { start: '2026-09-14' } });
  });

  test('stretching the start of a range moves only the start', () => {
    const change = buildPageTimelineChange({
      deltaDays: -2,
      endValue: null,
      endProperty: null,
      mode: 'RESIZE_START',
      startProperty: 'when',
      startValue: { end: '2026-09-18', start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { end: '2026-09-18', start: '2026-09-12' } });
  });

  test('the start never goes after the end', () => {
    const change = buildPageTimelineChange({
      deltaDays: 30,
      endValue: null,
      endProperty: null,
      mode: 'RESIZE_START',
      startProperty: 'when',
      startValue: { end: '2026-09-18', start: '2026-09-14' },
    });

    expect(change).toEqual({ when: { start: '2026-09-18' } });
  });

  test('with the end in another property, moving writes both properties at once', () => {
    const change = buildPageTimelineChange({
      deltaDays: 7,
      endProperty: 'due',
      endValue: { start: '2026-09-20' },
      mode: 'MOVE',
      startProperty: 'begin',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ begin: { start: '2026-09-21' }, due: { start: '2026-09-27' } });
  });

  test('with the end in another property, stretching the end writes only that property', () => {
    const change = buildPageTimelineChange({
      deltaDays: 2,
      endProperty: 'due',
      endValue: { start: '2026-09-20' },
      mode: 'RESIZE_END',
      startProperty: 'begin',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ due: { start: '2026-09-22' } });
  });

  test('with the end in another property and nothing in it, stretching the end sets it', () => {
    const change = buildPageTimelineChange({
      deltaDays: 3,
      endProperty: 'due',
      endValue: null,
      mode: 'RESIZE_END',
      startProperty: 'begin',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ due: { start: '2026-09-17' } });
  });

  test('with the end in another property, stretching the start writes only the start property', () => {
    const change = buildPageTimelineChange({
      deltaDays: -3,
      endProperty: 'due',
      endValue: { start: '2026-09-20' },
      mode: 'RESIZE_START',
      startProperty: 'begin',
      startValue: { start: '2026-09-14' },
    });

    expect(change).toEqual({ begin: { start: '2026-09-11' } });
  });
});
