'use client';

import { useTranslations } from 'next-intl';
import { PAGE_COLLABORATION_DEGRADED_STATUSES } from '../../constants/pages.collaboration.constants';
import { getCollaborationStatusLabelKey } from '../../lib/pages.collaboration.lib';
import type { CollaborationStatus, PageCollaborationParticipant } from '../../types/pages.collaboration.types';

interface IProps {
  readonly participants: readonly PageCollaborationParticipant[];
  readonly status: CollaborationStatus | null;
}

/**
 * Says whether the page is being written together, and by whom.
 *
 * While everything works it is only announced to screen readers: a connection
 * doing its job is not news.
 */
export const PagesEditorCollaborationStatus = ({ participants, status }: IProps) => {
  const t = useTranslations('pages');
  if (status === null) return null;

  const fallback = PAGE_COLLABORATION_DEGRADED_STATUSES.includes(status) ? ` ${t('collaboration.fallback')}` : '';

  return (
    <>
      <p
        aria-live="polite"
        className={status === 'connected' ? 'sr-only' : 'text-muted-foreground text-xs'}
        role="status"
      >
        {`${t(getCollaborationStatusLabelKey(status))}${fallback}`}
      </p>
      {participants.length > 0 && (
        <ul aria-label={t('collaboration.participants')} className="flex flex-wrap gap-2">
          {participants.map((participant) => (
            <li key={participant.clientId}>
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full border-2 bg-background font-medium text-foreground text-xs"
                style={{ borderColor: participant.color ?? undefined }}
                title={participant.name}
              >
                {(participant.name.length > 0 ? participant.name : t('collaboration.participantFallback'))
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <span className="sr-only">
                {participant.name.length > 0 ? participant.name : t('collaboration.participantFallback')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
