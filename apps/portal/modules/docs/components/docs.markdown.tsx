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

/** Headings receive ids on the way in so each one can be linked to. */
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
