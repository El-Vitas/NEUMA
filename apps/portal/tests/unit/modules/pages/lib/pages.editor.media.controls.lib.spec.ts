import { describe, expect, it } from 'bun:test';
import { createPageMediaControls } from '@/modules/pages/lib/pages.editor.media.controls.lib';
import type { PageEditorMediaLabels } from '@/modules/pages/types/pages.editor.media.types';

const LABELS: PageEditorMediaLabels = {
  fullScreen: 'Full screen',
  mute: 'Mute',
  pause: 'Pause',
  play: 'Play',
  resize: 'Resize',
  seek: 'Position',
  unmute: 'Unmute',
};

const playerWith = (state: { duration: number; paused: boolean; currentTime: number }): HTMLAudioElement => {
  const player = document.createElement('audio');
  Object.defineProperty(player, 'duration', { get: () => state.duration });
  Object.defineProperty(player, 'paused', { get: () => state.paused });
  Object.defineProperty(player, 'currentTime', { get: () => state.currentTime, set: () => undefined });
  return player;
};

const readBar = (bar: HTMLElement): { readonly labels: (string | null)[]; readonly moment: string } => ({
  labels: Array.from(bar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label')),
  moment: bar.querySelector('span')?.textContent ?? '',
});

describe('the controls a player is worked by', () => {
  it('says where it is, how long it lasts, and what each button does', () => {
    const player = playerWith({ currentTime: 7, duration: 118, paused: true });

    const bar = createPageMediaControls(player, LABELS);

    expect(readBar(bar)).toEqual({ labels: ['Play', 'Mute'], moment: '0:07 / 1:58' });
  });

  /** The button has to say what it will do next, and it is the player that decides when that changed. */
  it('turns into a pause once the player is playing, and back when it stops', () => {
    const state = { currentTime: 0, duration: 10, paused: true };
    const player = playerWith(state);
    const bar = createPageMediaControls(player, LABELS);

    state.paused = false;
    player.dispatchEvent(new Event('play'));
    expect(readBar(bar).labels[0]).toBe('Pause');

    state.paused = true;
    player.dispatchEvent(new Event('pause'));
    expect(readBar(bar).labels[0]).toBe('Play');
  });

  it('offers to take a video to the whole screen, and a recording nothing of the sort', () => {
    const recording = createPageMediaControls(playerWith({ currentTime: 0, duration: 1, paused: true }), LABELS);
    const video = createPageMediaControls(document.createElement('video'), LABELS);

    expect(readBar(recording).labels).not.toContain('Full screen');
    expect(readBar(video).labels).toContain('Full screen');
  });

  it('draws its marks with no colour of their own', () => {
    const bar = createPageMediaControls(playerWith({ currentTime: 0, duration: 1, paused: true }), LABELS);

    const mark = bar.querySelector('svg');
    expect(mark?.getAttribute('stroke')).toBe('currentColor');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
  });
});
