import { PAGE_EDITOR_MEDIA_MINUTE, PAGE_EDITOR_MEDIA_TIME_PAD } from '../constants/pages.editor.blocks.constants';

const pad = (amount: number): string => String(amount).padStart(PAGE_EDITOR_MEDIA_TIME_PAD, '0');

/**
 * How far along something that plays is, said the way every player says it:
 * minutes and seconds, and hours only once there are any.
 *
 * A length nobody knows yet — a recording still being read — is said as zero
 * rather than as `NaN`, which is not a moment in anything.
 */
export const describePageMediaTime = (seconds: number): string => {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(whole / PAGE_EDITOR_MEDIA_MINUTE) % PAGE_EDITOR_MEDIA_MINUTE;
  const hours = Math.floor(whole / (PAGE_EDITOR_MEDIA_MINUTE * PAGE_EDITOR_MEDIA_MINUTE));
  const tail = `${hours > 0 ? pad(minutes) : String(minutes)}:${pad(whole % PAGE_EDITOR_MEDIA_MINUTE)}`;
  return hours > 0 ? `${String(hours)}:${tail}` : tail;
};

/** Where it is and how long it lasts, on the one line a player has for both. */
export const describePageMediaMoment = (at: number, length: number): string =>
  `${describePageMediaTime(at)} / ${describePageMediaTime(length)}`;
