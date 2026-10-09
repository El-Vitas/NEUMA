import {
  PAGE_EDITOR_MEDIA_MINUTE,
  PAGE_EDITOR_MEDIA_TIME_PAD,
} from '../../blocks/constants/pages.editor.blocks.constants';

const pad = (amount: number): string => String(amount).padStart(PAGE_EDITOR_MEDIA_TIME_PAD, '0');

/** Formats as `m:ss`, with hours only when present. Unknown durations (`NaN`, `Infinity`) read as zero. */
export const describePageMediaTime = (seconds: number): string => {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(whole / PAGE_EDITOR_MEDIA_MINUTE) % PAGE_EDITOR_MEDIA_MINUTE;
  const hours = Math.floor(whole / (PAGE_EDITOR_MEDIA_MINUTE * PAGE_EDITOR_MEDIA_MINUTE));
  const tail = `${hours > 0 ? pad(minutes) : String(minutes)}:${pad(whole % PAGE_EDITOR_MEDIA_MINUTE)}`;
  return hours > 0 ? `${String(hours)}:${tail}` : tail;
};

export const describePageMediaMoment = (at: number, length: number): string =>
  `${describePageMediaTime(at)} / ${describePageMediaTime(length)}`;
