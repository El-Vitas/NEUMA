'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';
import {
  DISCUSSION_COMPOSER_ROWS,
  DISCUSSION_MENTION_RESULTS_MAX,
  EMPTY_DISCUSSION_DRAFT,
} from '../constants/pages.discussions.constants';
import {
  answerDiscussionKey,
  buildCommentBody,
  filterPersonOptions,
  findMentionQuery,
  insertMention,
} from '../lib/pages.discussions.composer.lib';
import type { DiscussionDraft, DiscussionMentionQuery } from '../types/pages.discussions.types';
import { PagesDiscussionsMentionList } from './pages.discussions.mention-list';

interface IProps {
  readonly focusOnOpen?: boolean;
  readonly initialDraft?: DiscussionDraft;
  readonly isBusy: boolean;
  readonly label: string;
  readonly onCancel?: () => void;
  /** Resolves true when the text was kept, so the composer can clear itself. */
  readonly onSubmit: (body: ReturnType<typeof buildCommentBody>) => Promise<boolean>;
  readonly personOptions: readonly PagePersonOption[];
  readonly submitLabel: string;
}

export const PagesDiscussionsComposer = ({
  focusOnOpen = false,
  initialDraft = EMPTY_DISCUSSION_DRAFT,
  isBusy,
  label,
  onCancel,
  onSubmit,
  personOptions,
  submitLabel,
}: IProps) => {
  const t = useTranslations('pages');
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<DiscussionDraft>(initialDraft);
  const [found, setFound] = useState<DiscussionMentionQuery | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const options = useMemo(
    () => (found === null ? [] : filterPersonOptions(personOptions, found.query, DISCUSSION_MENTION_RESULTS_MAX)),
    [found, personOptions],
  );
  const body = buildCommentBody(draft);

  useEffect(() => {
    if (focusOnOpen) textareaRef.current?.focus();
  }, [focusOnOpen]);

  const choose = (person: PagePersonOption): void => {
    if (found === null) return;
    const inserted = insertMention(draft, found, person);
    setDraft(inserted.draft);
    setFound(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  const submit = async (): Promise<void> => {
    if (body.length === 0 || isBusy) return;
    if (await onSubmit(body)) {
      setDraft(EMPTY_DISCUSSION_DRAFT);
      setFound(null);
    }
  };

  const answerKey = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    const answer = answerDiscussionKey(event, {
      isListOpen: found !== null,
      optionsCount: options.length,
      selectedIndex,
    });
    if (answer.kind === 'none') return;
    event.preventDefault();
    if (answer.kind === 'move') setSelectedIndex(answer.index);
    if (answer.kind === 'close') {
      event.stopPropagation();
      setFound(null);
    }
    const chosen = options[selectedIndex];
    if (answer.kind === 'choose' && chosen !== undefined) choose(chosen);
    if (answer.kind === 'submit') void submit();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {found !== null && (
          <PagesDiscussionsMentionList id={listId} onChoose={choose} options={options} selectedIndex={selectedIndex} />
        )}
        <textarea
          aria-autocomplete="list"
          aria-controls={found === null ? undefined : listId}
          aria-label={label}
          className="min-h-20 w-full rounded-none border border-input bg-transparent p-3 font-reading text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          onChange={(event) => {
            const next = { ...draft, text: event.target.value };
            setDraft(next);
            setFound(findMentionQuery(next.text, event.target.selectionStart));
            setSelectedIndex(0);
          }}
          onKeyDown={answerKey}
          placeholder={t('discussions.writeHint')}
          ref={textareaRef}
          rows={DISCUSSION_COMPOSER_ROWS}
          value={draft.text}
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel !== undefined && (
          <Button className="min-h-11" onClick={onCancel} size="sm" type="button" variant="ghost">
            {t('discussions.cancel')}
          </Button>
        )}
        <Button
          className="min-h-11"
          disabled={body.length === 0 || isBusy}
          onClick={() => void submit()}
          size="sm"
          type="button"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
