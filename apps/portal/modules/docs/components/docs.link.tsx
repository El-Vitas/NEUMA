import type { ComponentProps } from 'react';
import { isLinkOutside } from '../lib/docs.link.lib';

/** External links open in a new tab so the reader does not lose the page they were reading. */
export const DocsLink = ({ children, href }: ComponentProps<'a'>) => {
  if (!isLinkOutside(href)) return <a href={href}>{children}</a>;

  return (
    <a href={href} rel="noreferrer noopener" target="_blank">
      {children}
    </a>
  );
};
