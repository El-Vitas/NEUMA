import { describe, expect, it } from 'bun:test';
import { readPageEmbedFrameUrl, readPageEmbedProvider } from '@/modules/pages/editor/media/lib/pages.editor.embed.lib';

describe('which service a link belongs to', () => {
  it('recognises the four it can show', () => {
    expect(readPageEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(readPageEmbedProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(readPageEmbedProvider('https://vimeo.com/76979871')).toBe('vimeo');
    expect(readPageEmbedProvider('https://www.loom.com/share/abc123')).toBe('loom');
    expect(readPageEmbedProvider('https://www.figma.com/design/abcdefghijklmnopqrstuv/Algo')).toBe('figma');
  });

  /** A link to something else is not refused here: it is simply not one of these. */
  it('says nothing about a link to anywhere else', () => {
    expect(readPageEmbedProvider('https://example.com/a')).toBeNull();
    expect(readPageEmbedProvider('http://www.youtube.com/watch?v=abc')).toBeNull();
    expect(readPageEmbedProvider('no es una url')).toBeNull();
  });
});

describe('what is put in the frame', () => {
  it('shows a video by the address the service plays it at, not the one it is shared at', () => {
    expect(readPageEmbedFrameUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(readPageEmbedFrameUrl('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(readPageEmbedFrameUrl('vimeo', 'https://vimeo.com/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    );
    expect(readPageEmbedFrameUrl('loom', 'https://www.loom.com/share/abc123')).toBe(
      'https://www.loom.com/embed/abc123',
    );
  });

  /** A drawing is shown by handing the address itself to the service that drew it. */
  it('shows a drawing through the service that holds it', () => {
    expect(readPageEmbedFrameUrl('figma', 'https://www.figma.com/design/abcdefghijklmnopqrstuv/Algo')).toBe(
      'https://www.figma.com/embed?embed_host=company-brain&url=https%3A%2F%2Fwww.figma.com%2Fdesign%2Fabcdefghijklmnopqrstuv%2FAlgo',
    );
  });

  it('says nothing when the address holds nothing to show', () => {
    expect(readPageEmbedFrameUrl('youtube', 'https://www.youtube.com/')).toBeNull();
    expect(readPageEmbedFrameUrl('vimeo', 'https://vimeo.com/canales')).toBeNull();
    expect(readPageEmbedFrameUrl('loom', 'https://www.loom.com/')).toBeNull();
  });

  it('leaves an address that is already a frame alone', () => {
    expect(readPageEmbedFrameUrl('youtube', 'https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(readPageEmbedFrameUrl('loom', 'https://www.loom.com/embed/abc123')).toBe(
      'https://www.loom.com/embed/abc123',
    );
  });
});
