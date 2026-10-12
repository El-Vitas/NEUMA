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

const askForBookOfPictures = async (name: string): Promise<IconifyJSON> => {
  const answer = await fetch(`${DIAGRAM_ICONS_PATH}${name}`);
  const said: unknown = await answer.json();
  if (!isBookOfPictures(said)) throw new Error('diagram-icons-unreadable');
  return said;
};

/** Icon packs are served by us, so drawing a diagram never contacts a third-party server. */
const teachTheEngine = async (): Promise<void> => {
  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.registerIconPacks([
    { loader: () => askForBookOfPictures(DIAGRAM_BRAND_ICONS_NAME), name: DIAGRAM_BRAND_ICONS_NAME },
    { loader: () => askForBookOfPictures(DIAGRAM_MATERIAL_ICONS_NAME), name: DIAGRAM_MATERIAL_ICONS_NAME },
  ]);
  await mermaid.registerExternalDiagrams([zenumlDiagram]);
};

/** A failed registration is forgotten so the next diagram retries instead of failing all session. */
const teachTheEngineOnce = (): Promise<void> => {
  taught ??= teachTheEngine().catch((reason: unknown) => {
    taught = null;
    throw reason;
  });
  return taught;
};

const readGround = (): 'dark' | 'default' =>
  document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`)?.classList.contains(DARK_THEME_CLASS) === true
    ? 'dark'
    : 'default';

const readToken = (worn: CSSStyleDeclaration, name: string, otherwise: string): string => {
  const said = worn.getPropertyValue(name).trim();
  return said.length === 0 || said.includes('var(') ? otherwise : said;
};

/** With an inherited font the engine measures in one font and draws in another, so text overflows its box. */
const readLook = (): { readonly edgeLabelBackground: string; readonly fontFamily: string } => {
  const dressed = document.querySelector(`[${THEME_ROOT_ATTRIBUTE}]`) ?? document.body;
  const worn = getComputedStyle(dressed);
  return {
    edgeLabelBackground: readToken(worn, DIAGRAM_GROUND_TOKEN, 'transparent'),
    fontFamily: worn.fontFamily,
  };
};

const nameTheShareColours = (): Record<string, string> =>
  Object.fromEntries(DIAGRAM_SHARE_COLOURS.map((colour, index) => [`pie${String(index + 1)}`, colour]));

/** Applied before each drawing. Labels are laid out as HTML so words are measured, not guessed. */
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

/** The source is untrusted: links are disarmed, tags stripped and no external address survives. */
export const drawDiagram = async (source: string): Promise<Drawn> => {
  const waited = inTurn;
  const turn = (async (): Promise<Drawn> => {
    await waited;
    return drawInTurn(source);
  })();
  inTurn = turn.catch(() => undefined);
  return turn;
};

/** The engine has global settings: concurrent draws would colour the first with the second's settings. */
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
