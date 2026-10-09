import { PAGE_CODE_LANGUAGES } from '@company-brain/shared';
import type { PageEditorLabels, PageEditorSay } from '../types/pages.editor.labels.types';

const buildCodeLabels = (say: PageEditorSay): PageEditorLabels['nodeViews']['code'] => ({
  copied: say('codeCopied'),
  copy: say('copyCode'),
  copyFailed: say('codeCopyFailed'),
  diagram: {
    actualSize: say('diagramActualSize'),
    both: say('diagramView.both'),
    code: say('diagramView.code'),
    download: say('diagramDownload'),
    drawing: say('diagramView.drawing'),
    fitToFrame: say('diagramFitToFrame'),
    frameHeight: say('diagramFrameHeight'),
    frameHeightHint: say('diagramFrameHeightHint'),
    formula: {
      both: say('formulaView.both'),
      code: say('formulaView.code'),
      drawing: say('formulaView.drawing'),
    },
    fullScreen: say('diagramFullScreen'),
    line: say('diagramLine'),
    unknown: say('diagramUnknown'),
    zoomIn: say('diagramZoomIn'),
    zoomOut: say('diagramZoomOut'),
  },
  language: say('codeLanguage'),
  languages: Object.fromEntries(PAGE_CODE_LANGUAGES.map((language) => [language, say(`codeLanguages.${language}`)])),
  wrap: say('wrapCode'),
});

const buildNodeViewLabels = (say: PageEditorSay, locale: string): PageEditorLabels['nodeViews'] => ({
  button: {
    deed: say('buttonDeed'),
    deeds: { blocks: say('buttonDeedBlocks'), row: say('buttonDeedRow') },
    name: say('buttonName'),
    needsCollection: say('buttonNeedsCollection'),
    place: say('buttonPlace'),
    places: { below: say('buttonPlaceBelow'), bottom: say('buttonPlaceBottom'), top: say('buttonPlaceTop') },
    setup: say('buttonSetup'),
  },
  code: buildCodeLabels(say),
  collection: say('collectionBlock'),
  contents: { empty: say('pageContentsEmpty'), title: say('pageContents') },
  date: { field: say('date.field'), label: say('dateBlock'), locale },
  embed: {
    providers: { figma: 'Figma', loom: 'Loom', vimeo: 'Vimeo', youtube: 'YouTube' },
    refused: say('embedRefused'),
    resize: say('resizeEmbed'),
  },
  file: { fullScreen: say('mediaFullScreen'), resize: say('resizeFile') },
  formula: {
    done: say('formula.done'),
    empty: say('formulaEmpty'),
    field: say('formula.field'),
    help: say('formula.help'),
    inline: say('commands.formulaInline'),
    unreadable: say('formulaUnreadable'),
  },
  image: { caption: say('imageCaption'), resize: say('resizeImage') },
  media: {
    fullScreen: say('mediaFullScreen'),
    mute: say('mediaMute'),
    pause: say('mediaPause'),
    play: say('mediaPlay'),
    resize: say('resizeMedia'),
    seek: say('mediaSeek'),
    unmute: say('mediaUnmute'),
  },
  mentionTrashed: {
    label: say('mentionTrashed.label'),
    tooltip: (name: string) => say('mentionTrashed.tooltip', { name }),
  },
  person: say('personBlock'),
  subpage: { subpage: say('subpageBlock'), untitled: say('untitled') },
  synced: { lost: say('syncedLost'), source: say('syncedSource'), synced: say('syncedBlock') },
  task: say('taskBlock'),
  toggle: { open: say('openToggle'), title: say('toggleTitle') },
  unsupported: say('unsupportedBlock'),
});

/** Built once per page open: a locale change reloads the page under its own address. */
export const buildPageEditorLabels = (say: PageEditorSay, locale: string): PageEditorLabels => ({
  blockComments: say('blockComments'),
  blockTooLong: say('blockTooLong'),
  buttonEmpty: say('buttonEmpty'),
  collectionWording: {
    firstProperty: say('collection.firstProperty'),
    firstView: say('collection.firstView'),
    titleProperty: say('collection.titleProperty'),
  },
  foldHeading: say('foldHeading'),
  insertBlock: say('insertBlock'),
  newCollectionTitle: say('collection.newTitle'),
  nodeViews: buildNodeViewLabels(say, locale),
  resizeColumn: say('resizeColumn'),
  selectBlock: say('selectBlock'),
  untitled: say('untitled'),
  writeHere: say('writeHere'),
});
