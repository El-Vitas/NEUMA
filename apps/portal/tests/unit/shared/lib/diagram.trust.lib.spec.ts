import { describe, expect, it } from 'bun:test';
import { keepTheDiagramSourceToItself, keepTheDrawingToItself, mendTheDrawing } from '@/shared/lib/diagram.trust.lib';

/**
 * One family writes what a line means in a grey it carries in its own code,
 * chosen for a white page: on a page read at night that is the only word
 * explaining the arrow, written in a colour nobody can see.
 */
describe('writing the engine painted in a grey of its own', () => {
  it('is lifted to the colour of the page around it', () => {
    const mended = mendTheDrawing('<svg><text fill="#444444">escribe en</text></svg>');

    expect(mended).toContain('fill="currentColor"');
    expect(mended).not.toContain('#444444');
  });

  it('leaves alone the colours somebody chose on purpose', () => {
    const drawing = '<svg><rect fill="#134e4a"/><text fill="#ccfbf1">Propio</text></svg>';

    expect(mendTheDrawing(drawing)).toBe(drawing);
  });
});

/**
 * The drawing is put on the page for an instant to be measured, and whatever it
 * asks for is asked for during that instant — so what is about to be drawn is
 * cleaned before it is drawn, and not only afterwards.
 */
describe('what the writing of a diagram is allowed to reach', () => {
  it('takes out an address asked of somebody else', () => {
    const kept = keepTheDiagramSourceToItself(
      "%%{init: {'themeCSS': '.node rect { background: url(https://ajeno.example/fondo.gif); }'}}%%\nflowchart TD\n  A --> B",
    );

    expect(kept).not.toContain('ajeno.example');
    expect(kept).toContain('flowchart TD');
  });

  it('leaves the writing alone when it points at nothing outside', () => {
    const written = 'flowchart TD\n  A[Mira https://ejemplo.cl] --> B\n  B --> C';

    expect(keepTheDiagramSourceToItself(written)).toBe(written);
  });
});

/**
 * A diagram is written by whoever can write on the page and looked at by
 * everyone who reads it, so nothing in a drawing may reach outside the page:
 * an address in a drawing is a question asked of a stranger's server, once for
 * every reader, and the stranger learns who is reading and from where.
 */
describe('what a drawing is allowed to reach', () => {
  it('drops a picture asked of somebody else', () => {
    const kept = keepTheDrawingToItself('<svg><image href="https://ajeno.example/rastro.gif"/></svg>');

    expect(kept).not.toContain('ajeno.example');
  });

  it('drops the same picture however it is asked for', () => {
    const kept = keepTheDrawingToItself(
      '<svg><foreignObject><img src="https://ajeno.example/rastro.gif"></foreignObject></svg>',
    );

    expect(kept).not.toContain('ajeno.example');
  });

  it('drops an address hidden in the way something is painted', () => {
    const kept = keepTheDrawingToItself(
      '<svg><rect style="background-image:url(https://ajeno.example/fondo.gif)"/></svg>',
    );

    expect(kept).not.toContain('ajeno.example');
  });

  it('drops an address hidden in the style the drawing carries', () => {
    const kept = keepTheDrawingToItself(
      '<svg><style>.node rect{background:url("https://ajeno.example/fondo.gif")}</style><rect/></svg>',
    );

    expect(kept).not.toContain('ajeno.example');
  });

  /** A drawing points at its own pieces all the time, and that is the whole of how it is drawn. */
  it('leaves alone what the drawing points at inside itself', () => {
    const kept = keepTheDrawingToItself(
      '<svg><defs><marker id="punta"/></defs><path marker-end="url(#punta)" d="M0 0"/><use href="#punta"/></svg>',
    );

    expect(kept).toContain('url(#punta)');
    expect(kept).toContain('href="#punta"');
    expect(kept).toContain('d="M0 0"');
  });

  /** The stamps a diagram may name travel inside the drawing itself, and must survive it. */
  it('leaves alone a picture that travels inside the drawing', () => {
    const kept = keepTheDrawingToItself('<svg><image href="data:image/png;base64,iVBORw0KGgo="/></svg>');

    expect(kept).toContain('data:image/png;base64');
  });
});
