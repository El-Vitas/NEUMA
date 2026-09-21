import Markdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { DOCS_MARKDOWN_STYLE_CLASS } from '../constants/docs.style.constants';
import { DocsFence } from './docs.fence';
import { DocsLink } from './docs.link';
import { DocsTable } from './docs.table';

interface IProps {
  readonly markdown: string;
}

/**
 * A document, shown as it was written.
 *
 * The writing is the source: nothing here is held in the code, so writing
 * documentation is writing a file and never touching a screen. Headings are
 * given names of their own on the way in, which is what makes every one of them
 * something somebody can link to and land on.
 */
export const DocsMarkdown = ({ markdown }: IProps) => (
  <div className={DOCS_MARKDOWN_STYLE_CLASS}>
    <Markdown
      components={{ a: DocsLink, code: DocsFence, table: DocsTable }}
      rehypePlugins={[rehypeSlug]}
      remarkPlugins={[remarkGfm]}
    >
      {markdown}
    </Markdown>
  </div>
);
