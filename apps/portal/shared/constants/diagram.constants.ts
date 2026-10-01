/** What separates the four numbers of the box a drawing was drawn inside. */
export const DIAGRAM_BOX_GAP = /\s+/;

/** The grey one family has written into itself for a white page, and reaches by no setting of ours. */
export const DIAGRAM_HARDCODED_GREY = '#444444';

/**
 * The colours a drawing uses when it needs several that tell each other apart.
 *
 * The engine derives them from its own base colour, which on a dark page makes
 * the first slice of a pie all but the page itself — the largest share of the
 * whole, drawn invisible. These are chosen to read on either ground and to stay
 * apart from each other for whoever does not see colour as everyone else does.
 */
export const DIAGRAM_SHARE_COLOURS = [
  '#2dd4bf',
  '#a78bfa',
  '#fbbf24',
  '#fb7185',
  '#38bdf8',
  '#a3e635',
  '#fb923c',
  '#22d3ee',
];

/**
 * What has to be mended in a drawing the engine dressed for daylight only.
 *
 * A tree writes its names in black, and the family that maps systems writes
 * what a line means in a grey it carries in its own code — both invisible on a
 * page read at night. They are told to use the colour of the writing around
 * them, which is the only colour that is right on either ground.
 */
export const DIAGRAM_MENDED_STYLE_CLASS = [
  /** The engine names its own rules after the drawing, which outranks ours unless ours insists. */
  'text-foreground',
  '[&_.treeView-node-label]:fill-current!',
  '[&_.treeView-node-line]:stroke-current!',
  /**
   * The engine measures a label's lines away from the page and sizes its box by
   * them; the page's own paragraph spacing, reaching into the label, makes every
   * line taller than measured and pushes the last ones out of the box.
   */
  '[&_svg_p]:m-0! [&_svg_p]:leading-[inherit]!',
].join(' ');

/** How far a drawing can be pushed away and how close it can be brought. */
export const DIAGRAM_ZOOM_LEAST = 0.25;
export const DIAGRAM_ZOOM_MOST = 4;

/** How much closer one turn of the wheel brings a drawing. */
export const DIAGRAM_ZOOM_WHEEL_STEP = 1.1;

/** How much closer one press of a zoom button brings a drawing: more than a turn of the wheel, since it is one press. */
export const DIAGRAM_ZOOM_BUTTON_STEP = 1.25;

/** How the zoom is written beside its buttons: as a share of the drawing's own size. */
export const DIAGRAM_ZOOM_PERCENT = 100;

/** What a drawing that reaches past its box says it can be: taken hold of and moved. */
export const DIAGRAM_MOVABLE_STYLE_CLASS = 'cursor-grab';

/**
 * A frame nobody sized is kept within the screen: a drawing taller than that is
 * gone through inside its frame instead of pushing the page down past it.
 */
export const DIAGRAM_BOUNDED_STYLE_CLASS = 'max-h-[70vh]';

/** Every drawing on a page needs a name of its own, or two of them draw over each other. */
export const DIAGRAM_NAME_PREFIX = 'drawn-diagram-';

/** Where the engine says the drawing broke. */
export const DIAGRAM_FAULT_LINE = /line (\d+)/i;

/** The colon a parser leaves hanging at the end of what it says. */
export const DIAGRAM_TRAILING_COLON = /:$/;

/** How the engine says it did not recognise what was written as a diagram at all. */
export const DIAGRAM_UNKNOWN_SAID = /no diagram type detected/i;

/** Something failed and said nothing about itself; the page still has to say something. */
export const DIAGRAM_UNSAID = 'unknown';

/** How a diagram names the pictures it can draw with: the marks of known things, and everything else. */
export const DIAGRAM_BRAND_ICONS_NAME = 'logos';
export const DIAGRAM_MATERIAL_ICONS_NAME = 'mdi';

/** Where a book of pictures is asked for, which is here and never elsewhere. */
export const DIAGRAM_ICONS_PATH = '/api/diagram-icons/';

/** A book only changes when the page is built anew, so whoever asks for one keeps it a day, and a week at a pinch. */
export const DIAGRAM_ICONS_KEPT_SECONDS = 86_400;
export const DIAGRAM_ICONS_STALE_SECONDS = 604_800;

/** How something in a drawing says where to fetch what it shows. */
export const DIAGRAM_FETCHING_ATTRIBUTES = ['src', 'href', 'xlink:href', 'data', 'poster', 'srcset'];

/** What a drawing carries that exists only to fetch something, and is worth nothing without it. */
export const DIAGRAM_FETCHING_ELEMENTS = 'img, image, iframe, object, embed, link, script, use, audio, video';

/** An address asked of somewhere else, written the way a style asks for one. */
export const DIAGRAM_OUTSIDE_URL = /url\(\s*['"]?(?!#|data:)[^)]*\)/gi;

/**
 * A tag whose whole purpose is to fetch something, written inside a label.
 *
 * Labels are laid out as little pages of their own, which is the only way the
 * engine measures a word instead of guessing at it — and what a page can do,
 * one of these can do — so they are taken out of the writing before anything is
 * drawn, and the rest of what a label may say is left alone.
 */
export const DIAGRAM_FETCHING_TAG =
  /<\s*\/?\s*(?:img|image|iframe|object|embed|link|script|source|track|audio|video)\b[^>]*>/gi;

/**
 * The ground a drawing sits on, which is the ground a label on a line has to
 * sit on too — asked of the token the theme itself sets, and not of the one the
 * interface derives from it, which is resolved once for the light theme and
 * answers with a pale colour in the middle of the night.
 */
export const DIAGRAM_GROUND_TOKEN = '--surface-container-low';

/** How the interface names the bookkeeping it hangs on the root of the page. */
export const DIAGRAM_ROOT_BOOKKEEPING_PREFIX = '__react';
