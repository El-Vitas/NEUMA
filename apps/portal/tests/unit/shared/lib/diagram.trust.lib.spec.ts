import { describe, expect, it } from 'bun:test';
import {
  forgetWhatIsAskedOfOthers,
  keepTheDiagramSourceToItself,
  keepTheDrawingToItself,
  mendTheDrawing,
} from '@/shared/lib/diagram.trust.lib';

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

  it('leaves alone a piece pointed at inside the drawing, even with a space before it', () => {
    const written = 'flowchart TD\n  classDef x fill:url( #degradado)';

    expect(keepTheDiagramSourceToItself(written)).toBe(written);
  });

  it('takes out a fetching tag closed with spaces around its slash', () => {
    expect(keepTheDiagramSourceToItself('A[<img src=x>< / img>] --> B')).toBe('A[] --> B');
  });

  /** Lo escribe quien escribe en la página, y lo lee cada persona que la abre: no puede trabar al navegador. */
  it('reads a long run of spaces in one pass', () => {
    const startedAt = performance.now();

    keepTheDiagramSourceToItself(`url(${' '.repeat(20_000)}`);
    keepTheDiagramSourceToItself(`<${' '.repeat(20_000)}`);

    expect(performance.now() - startedAt).toBeLessThan(200);
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

  /*
   * The style a drawing carries is cleaned on its own: the simulated page these
   * tests run in drops a whole drawing that holds a style, so asking it would
   * prove nothing.
   */
  it('drops an address hidden in the style the drawing carries', () => {
    const kept = forgetWhatIsAskedOfOthers('.node rect{background:url("https://ajeno.example/fondo.gif")}');

    expect(kept).not.toContain('ajeno.example');
    expect(kept).toContain('.node rect{background:none}');
  });

  /** A style can ask for a whole other sheet by its address alone, with no url() around it. */
  it('drops a whole other sheet a style asks for, however its address is written', () => {
    const kept = forgetWhatIsAskedOfOthers(
      '@import "https://ajeno.example/a.css"; @import \'//ajeno.example/b.css\' screen; .node{fill:red}',
    );

    expect(kept).not.toContain('ajeno.example');
    expect(kept).toContain('.node{fill:red}');
  });

  it('takes a sheet asked for out of the writing too, before anything is drawn', () => {
    const kept = keepTheDiagramSourceToItself(
      '---\nconfig:\n  themeCSS: \'@import "https://ajeno.example/a.css";\'\n---\nflowchart LR\n  A --> B',
    );

    expect(kept).not.toContain('ajeno.example');
    expect(kept).toContain('A --> B');
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

/**
 * Lo que escribe un agente también se dibuja delante de todos. Si la limpieza
 * del motor dejara pasar algo, esta es la segunda línea.
 */
describe('a drawing that tries to run something', () => {
  it('drops a script, a handler on a piece, and a page opened inside a label', () => {
    const kept = keepTheDrawingToItself(
      '<svg onload="alert(1)"><script>alert(2)</script><g onclick="alert(3)"><rect/></g><foreignObject><div><iframe src="data:text/html,x"></iframe></div></foreignObject></svg>',
    );

    expect(kept).not.toContain('alert');
    expect(kept).not.toContain('<script');
    expect(kept).not.toContain('<iframe');
  });

  it('drops a link that would run something when followed', () => {
    const kept = keepTheDrawingToItself('<svg><a href="javascript:alert(1)"><text>Ir</text></a></svg>');

    expect(kept).not.toContain('javascript:');
    expect(kept).toContain('Ir');
  });
});
