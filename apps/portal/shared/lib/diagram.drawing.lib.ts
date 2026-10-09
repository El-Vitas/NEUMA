import type { IconifyJSON } from '@iconify/types';
import elkLayouts from '@mermaid-js/layout-elk';
import zenumlDiagram from '@mermaid-js/mermaid-zenuml';
import mermaid from 'mermaid';
import {
  DIAGRAM_BRAND_ICONS_NAME,
  DIAGRAM_GROUND_TOKEN,
  DIAGRAM_ICONS_PATH,
  DIAGRAM_MATERIAL_ICONS_NAME,
  DIAGRAM_NAME_PREFIX,
  DIAGRAM_SHARE_COLOURS,
} from '@/shared/constants/diagram.constants';
import { DARK_THEME_CLASS, THEME_ROOT_ATTRIBUTE } from '@/shared/constants/theme.constants';
import { describeDiagramFault } from '@/shared/lib/diagram.fault.lib';
import { hideWhatIsHungOnTheRoot } from '@/shared/lib/diagram.root.lib';
import { keepTheDiagramSourceToItself, keepTheDrawingToItself, mendTheDrawing } from '@/shared/lib/diagram.trust.lib';
import type { Drawn } from '@/shared/types/diagram.types';

let named = 0;
let taught: Promise<void> | null = null;
let inTurn: Promise<unknown> = Promise.resolve();

const isBookOfPictures = (answered: unknown): answered is IconifyJSON =>
  typeof answered === 'object' && answered !== null && 'prefix' in answered && 'icons' in answered;

/** A book is asked for here, and only once a diagram has named a picture from it. */
const askForBookOfPictures = async (name: string): Promise<IconifyJSON> => {
  const answer = await fetch(`${DIAGRAM_ICONS_PATH}${name}`);
  const said: unknown = await answer.json();
  if (!isBookOfPictures(said)) throw new Error('diagram-icons-unreadable');
  return said;
};

/**
 * Teaches the engine what it does not bring with it.
 *
 * Three things are added: the pictures a diagram may name, a second way of
 * laying a graph out for the ones the ordinary way crowds, and the one family
 * that ships apart from the rest.
 *
 * The pictures travel with the page, so naming one in a diagram is never a
 * request to somebody else's server — a page that draws itself in front of
 * whoever reads it should not tell a stranger who is reading.
 */
const teachTheEngine = async (): Promise<void> => {
  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.registerIconPacks([
    { loader: () => askForBookOfPictures(DIAGRAM_BRAND_ICONS_NAME), name: DIAGRAM_BRAND_ICONS_NAME },
    { loader: () => askForBookOfPictures(DIAGRAM_MATERIAL_ICONS_NAME), name: DIAGRAM_MATERIAL_ICONS_NAME },
  ]);
  await mermaid.registerExternalDiagrams([zenumlDiagram]);
};

/** Teaching that failed is forgotten, so the next diagram tries again instead of every one failing for the session. */
const teachTheEngineOnce = (): Promise<void> => {
  taught ??= teachTheEngine().catch((reason: unknown) => {
    taught = null;
    throw reason;
  });
  return taught;
};

/**
 * A diagram is coloured for the ground it is read on — asked of the element the
 * interface dresses, which is not the document itself.
 */
const readGround = (): 'dark' | 'default' =>
  document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`)?.classList.contains(DARK_THEME_CLASS) === true
    ? 'dark'
    : 'default';

const readToken = (worn: CSSStyleDeclaration, name: string, otherwise: string): string => {
  const said = worn.getPropertyValue(name).trim();
  return said.length === 0 || said.includes('var(') ? otherwise : said;
};

/**
 * How the page dresses, asked of the page itself.
 *
 * Told to inherit a font, the engine measures a label in one font and draws it
 * in another — it measures in the ordinary one and draws in whatever the block
 * it lands in wears — and the difference between the two is writing hanging out
 * of its own box. So it is told exactly what the page wears, and a label sits on
 * the same ground the drawing does instead of on a grey nobody chose.
 */
const readLook = (): { readonly edgeLabelBackground: string; readonly fontFamily: string } => {
  const dressed = document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`) ?? document.body;
  const worn = getComputedStyle(dressed);
  return {
    edgeLabelBackground: readToken(worn, DIAGRAM_GROUND_TOKEN, 'transparent'),
    fontFamily: worn.fontFamily,
  };
};

/** The colours of the shares of a whole, named the way the engine asks for them. */
const nameTheShareColours = (): Record<string, string> =>
  Object.fromEntries(DIAGRAM_SHARE_COLOURS.map((colour, index) => [`pie${String(index + 1)}`, colour]));

/**
 * The engine told how the page looks right now, before each drawing.
 *
 * Labels are laid out as little pages of their own, which is how a word is
 * measured instead of guessed at — guessing is what leaves writing hanging out
 * of its own box — and what could be smuggled into one of those pages was
 * already taken out of the writing before it got here.
 */
const dressTheEngine = (): void => {
  const look = readLook();
  mermaid.initialize({
    fontFamily: look.fontFamily,
    securityLevel: 'strict',
    startOnLoad: false,
    theme: readGround(),
    themeVariables: { edgeLabelBackground: look.edgeLabelBackground, ...nameTheShareColours() },
  });
  hideWhatIsHungOnTheRoot();
};

/**
 * Draws what was written, or says why it could not be drawn.
 *
 * Nothing the writing says is trusted with the page: links are disarmed, tags
 * are stripped, labels are drawn as drawing and never as a little page of their
 * own, and no address in the writing survives to be asked of anybody. What is
 * written in a diagram is written by whoever can write on the page, and the
 * page is read by everyone.
 */
export const drawDiagram = async (source: string): Promise<Drawn> => {
  const waited = inTurn;
  const turn = (async (): Promise<Drawn> => {
    await waited;
    return drawInTurn(source);
  })();
  inTurn = turn.catch(() => undefined);
  return turn;
};

/**
 * One drawing at a time.
 *
 * The engine is one machine with one set of settings: told what to draw twice
 * at once, the second telling arrives while the first is still drawing, and the
 * first comes out wearing the second's colours. A page with thirty diagrams on
 * it is exactly that, thirty times over.
 */
const drawInTurn = async (source: string): Promise<Drawn> => {
  try {
    await teachTheEngineOnce();
    dressTheEngine();
    named += 1;
    const { svg } = await mermaid.render(
      `${DIAGRAM_NAME_PREFIX}${String(named)}`,
      keepTheDiagramSourceToItself(source),
    );
    return { fault: null, html: keepTheDrawingToItself(mendTheDrawing(svg)) };
  } catch (error) {
    return { fault: describeDiagramFault(error), html: null };
  }
};
