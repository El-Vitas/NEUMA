import {
  PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_MARKS,
  PAGE_EDITOR_MEDIA_BAR_STYLE_CLASS,
  PAGE_EDITOR_MEDIA_SEEK_STEP,
  PAGE_EDITOR_MEDIA_SEEK_STYLE_CLASS,
  PAGE_EDITOR_MEDIA_TIME_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { askForTheWholeScreen, askTheBrowser } from '../../lib/pages.editor.asking.lib';
import { createPageMarkButton, showPageButtonAs } from '../../text/lib/pages.editor.marks.lib';
import type { PageEditorMediaLabels } from '../types/pages.editor.media.types';
import { describePageMediaMoment } from './pages.editor.media.lib';

const createSeekBar = (label: string): HTMLInputElement => {
  const seek = document.createElement('input');
  seek.type = 'range';
  seek.className = PAGE_EDITOR_MEDIA_SEEK_STYLE_CLASS;
  seek.dataset.mediaSeek = 'true';
  seek.min = '0';
  seek.max = '0';
  seek.step = PAGE_EDITOR_MEDIA_SEEK_STEP;
  seek.value = '0';
  seek.setAttribute('aria-label', label);
  return seek;
};

/** Custom controls over a real media element, replacing the browser's, which ignore the page theme. */
export const createPageMediaControls = (player: HTMLMediaElement, labels: PageEditorMediaLabels): HTMLElement => {
  const bar = document.createElement('div');
  const playing = createPageMarkButton(labels.play, PAGE_EDITOR_MARKS.play, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);
  const seek = createSeekBar(labels.seek);
  const moment = document.createElement('span');
  const sound = createPageMarkButton(labels.mute, PAGE_EDITOR_MARKS.sound, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);

  const showMoment = (): void => {
    moment.textContent = describePageMediaMoment(player.currentTime, player.duration);
  };
  const showLength = (): void => {
    seek.max = String(Number.isFinite(player.duration) ? player.duration : 0);
    showMoment();
  };
  const showPlaying = (): void => {
    if (player.paused) showPageButtonAs(playing, labels.play, PAGE_EDITOR_MARKS.play);
    else showPageButtonAs(playing, labels.pause, PAGE_EDITOR_MARKS.pause);
  };
  const showSound = (): void => {
    if (player.muted) showPageButtonAs(sound, labels.unmute, PAGE_EDITOR_MARKS.silent);
    else showPageButtonAs(sound, labels.mute, PAGE_EDITOR_MARKS.sound);
  };

  bar.className = PAGE_EDITOR_MEDIA_BAR_STYLE_CLASS;
  bar.dataset.mediaControls = 'true';
  moment.className = PAGE_EDITOR_MEDIA_TIME_STYLE_CLASS;
  bar.append(playing, seek, moment, sound);
  showLength();
  showPlaying();
  showSound();

  playing.addEventListener('click', () => {
    if (player.paused) askTheBrowser(player.play());
    else player.pause();
  });
  sound.addEventListener('click', () => {
    player.muted = !player.muted;
    showSound();
  });
  seek.addEventListener('input', () => {
    player.currentTime = Number(seek.value);
    showMoment();
  });
  player.addEventListener('loadedmetadata', showLength);
  player.addEventListener('durationchange', showLength);
  player.addEventListener('play', showPlaying);
  player.addEventListener('pause', showPlaying);
  player.addEventListener('timeupdate', () => {
    seek.value = String(player.currentTime);
    showMoment();
  });

  if (player instanceof HTMLVideoElement) {
    const wide = createPageMarkButton(
      labels.fullScreen,
      PAGE_EDITOR_MARKS.fullScreen,
      PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
    );
    wide.addEventListener('click', () => {
      const shown = player.parentElement;
      if (shown !== null) askForTheWholeScreen(shown);
    });
    bar.append(wide);
  }

  return bar;
};
