import { describe, expect, it } from 'bun:test';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import { createRefusedEmbed } from '@/modules/pages/editor/media/lib/pages.editor.embed.node-view.lib';

const labels = { providers: {}, refused: 'No se puede incrustar', resize: 'Cambiar tamaño' };

const embedOf = (url: string) => pageEditorSchema.node('embed', { provider: 'youtube', url });

describe('the view of an embed that cannot be shown', () => {
  it('links to a web address so the person can open it', () => {
    const { dom } = createRefusedEmbed(embedOf('https://ejemplo.com/canal'), labels);

    expect(dom.querySelector('a')?.getAttribute('href')).toBe('https://ejemplo.com/canal');
  });

  it('shows an address that is not a web address as text and never as a link', () => {
    const { dom } = createRefusedEmbed(embedOf('javascript:alert(1)'), labels);

    expect(dom.querySelector('a')).toBeNull();
    expect(dom.textContent).toContain('javascript:alert(1)');
  });
});
