'use client';

import { PagesProseMirrorEditor } from '../../components/pages.prose-mirror.editor';
import type { PageVersionDocument } from '../types/pages.history.types';

interface IProps {
  readonly document: PageVersionDocument;
  readonly spaceId: string;
}

/** The editor in read-only mode, so a version looks as the page did. Keyed by version: one document per mount. */
export const PagesHistoryPreview = ({ document, spaceId }: IProps) => (
  <PagesProseMirrorEditor
    canEdit={false}
    content={document.content}
    key={document.version}
    onContentChange={() => undefined}
    pageId={null}
    spaceId={spaceId}
  />
);
