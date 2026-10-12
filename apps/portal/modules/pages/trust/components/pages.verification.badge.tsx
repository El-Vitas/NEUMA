import type { PageVerificationStatus } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  PAGE_VERIFICATION_STATUS_ICON,
  PAGE_VERIFICATION_STATUS_LABEL_KEY,
  PAGE_VERIFICATION_STATUS_TEXT_CLASS,
} from '../constants/pages.verification.constants';

interface IProps {
  readonly status: PageVerificationStatus;
}

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
