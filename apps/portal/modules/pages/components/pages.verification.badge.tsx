import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  PAGE_VERIFICATION_STATUS_ICON,
  PAGE_VERIFICATION_STATUS_LABEL_KEY,
  PAGE_VERIFICATION_STATUS_TEXT_CLASS,
} from '../constants/pages.verification.constants';
import type { PageVerificationStatus } from '../types/pages.verification.types';

interface IProps {
  readonly status: PageVerificationStatus;
}

/**
 * What the page says about itself in words, not only in color.
 *
 * Verified and expired both keep a checkmark-shaped icon, since a page that
 * was once vouched for is still a different thing from one nobody ever looked
 * at — only the color and the word tell valid from expired apart.
 */
export const PagesVerificationBadge = ({ status }: IProps) => {
  const t = useTranslations('pages.verification');
  const Icon = PAGE_VERIFICATION_STATUS_ICON[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', PAGE_VERIFICATION_STATUS_TEXT_CLASS[status])}>
      <Icon aria-hidden="true" className="size-4" />
      {t(PAGE_VERIFICATION_STATUS_LABEL_KEY[status])}
    </span>
  );
};
