import type { Config } from 'dompurify';

export const DIAGRAM_BOX_GAP = /\s+/;

/** Hardcoded by one diagram family for a white page; no setting overrides it. */
export const DIAGRAM_HARDCODED_GREY = '#444444';

/** The engine derives its own from the base colour, which hides the first pie slice on a dark page. */
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

/** The engine's defaults are black or grey, invisible on a dark page; these follow the surrounding text colour. */
export const DIAGRAM_MENDED_STYLE_CLASS = [
  'text-foreground',
  '[&_.treeView-node-label]:fill-current!',
  '[&_.treeView-node-line]:stroke-current!',
  /** The engine sizes a label's box from lines measured off-page; page paragraph spacing pushes the last out. */
  '[&_svg_p]:m-0! [&_svg_p]:leading-[inherit]!',
].join(' ');

export const DIAGRAM_ZOOM_LEAST = 0.25;
export const DIAGRAM_ZOOM_MOST = 4;

export const DIAGRAM_ZOOM_WHEEL_STEP = 1.1;

export const DIAGRAM_GRIP_THRESHOLD_PX = 4;

export const DIAGRAM_ZOOM_BUTTON_STEP = 1.25;

export const DIAGRAM_ZOOM_PERCENT = 100;

export const DIAGRAM_MOVABLE_STYLE_CLASS = 'cursor-grab';

export const DIAGRAM_BOUNDED_STYLE_CLASS = 'max-h-[70vh]';

/** Unique per drawing, or two drawings render over each other. */
export const DIAGRAM_NAME_PREFIX = 'drawn-diagram-';

export const DIAGRAM_FAULT_LINE = /line (\d+)/i;

export const DIAGRAM_TRAILING_COLON = /:$/;

export const DIAGRAM_UNKNOWN_SAID = /no diagram type detected/i;

export const DIAGRAM_UNSAID = 'unknown';

export const DIAGRAM_BRAND_ICONS_NAME = 'logos';
export const DIAGRAM_MATERIAL_ICONS_NAME = 'mdi';

export const DIAGRAM_ICONS_PATH = '/api/diagram-icons/';

/** Icon sets only change when the app is rebuilt. */
export const DIAGRAM_ICONS_KEPT_SECONDS = 86_400;
export const DIAGRAM_ICONS_STALE_SECONDS = 604_800;

export const DIAGRAM_FETCHING_ATTRIBUTES = ['src', 'href', 'xlink:href', 'data', 'poster', 'srcset'];

export const DIAGRAM_FETCHING_ELEMENTS = 'img, image, iframe, object, embed, link, script, use, audio, video';

export const DIAGRAM_SANITIZE_OPTIONS: Config = {
  ADD_TAGS: ['foreignobject'],
  FORBID_TAGS: ['embed', 'iframe', 'object', 'script'],
  HTML_INTEGRATION_POINTS: { foreignobject: true },
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
};

/** Matches url() targets other than fragments and data URIs. */
export const DIAGRAM_OUTSIDE_URL = /url\((?!\s*['"]?(?:#|data:))[^)]*\)/gi;

/** Removed whole, up to the semicolon: an import needs no url() around its address. */
export const DIAGRAM_SHEET_IMPORT = /@import\b[^;]*;?/gi;

/** Labels are laid out as HTML, so fetching tags are stripped from the source before drawing. */
export const DIAGRAM_FETCHING_TAG =
  /<\s*(?:\/\s*)?(?:img|image|iframe|object|embed|link|script|source|track|audio|video)\b[^>]*>/gi;

/** Read from the token the theme sets: the derived token is resolved once for light and stays pale at night. */
export const DIAGRAM_GROUND_TOKEN = '--surface-container-low';

export const DIAGRAM_ROOT_BOOKKEEPING_PREFIX = '__react';
