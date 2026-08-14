import type { ComponentProps } from 'react';
import { isLinkOutside } from '../lib/docs.link.lib';

/**
 * A link in a document, and where it leads.
 *
 * One that leaves the workspace opens somewhere else and carries nothing with
 * it: whoever is reading a manual is in the middle of doing something, and
 * losing the page they were reading is the one thing a link should never cost
 * them.
 */
export const DocsLink = ({ children, href }: ComponentProps<'a'>) => {
  if (!isLinkOutside(href)) return <a href={href}>{children}</a>;

  return (
    <a href={href} rel="noreferrer noopener" target="_blank">
      {children}
    </a>
  );
};
