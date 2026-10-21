import type { PagePropertyType } from '@neuma/shared';
import { isValidPageUrl, PAGE_PROPERTY_TYPE } from '@neuma/shared';
import { readPropertyLinkHref } from '../lib/pages.properties.lib';

interface IProps {
  readonly isLinked: boolean;
  readonly text: string;
  readonly type: PagePropertyType;
}

/** The address is only a link when the whole value was accepted on its way in, so it is never a script. */
export const PagesPropertiesLinkValue = ({ isLinked, text, type }: IProps) => {
  if (text === '') return null;
  const isSafeAddress = type !== PAGE_PROPERTY_TYPE.URL || isValidPageUrl(text);
  if (!isLinked || !isSafeAddress) return <span className="underline decoration-dotted">{text}</span>;
  return (
    <a
      className="break-all underline underline-offset-2 hover:text-foreground"
      href={readPropertyLinkHref(type, text)}
      rel="noopener noreferrer"
      target={type === PAGE_PROPERTY_TYPE.URL ? '_blank' : undefined}
    >
      {text}
    </a>
  );
};
