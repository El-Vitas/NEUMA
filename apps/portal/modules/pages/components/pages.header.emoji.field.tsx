'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { findEmojiCandidates } from '../lib/pages.editor.emoji.lib';
import { getEmojiMenuQuery } from '../lib/pages.editor.slash-menu.lib';
import type { PageEmojiEntry } from '../types/pages.editor.emoji.types';

interface IProps {
  readonly ariaLabel: string;
  readonly className: string;
  readonly disabled: boolean;
  readonly id: string;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onChange: (title: string) => void;
  /** Where Enter goes once the title is written, since a title is not a line one stays on. */
  readonly onLeave: () => void;
  readonly placeholder: string;
  readonly value: string;
}

/**
 * The page title, written the same way the body is: `:` followed by letters
 * offers an emoji, typed further narrows it, and Enter writes the character
 * in, replacing the trigger the same way the body's own finder does.
 */
export const PagesHeaderEmojiField = ({
  ariaLabel,
  className,
  disabled,
  id,
  inputRef,
  onChange,
  onLeave,
  placeholder,
  value,
}: IProps) => {
  const t = useTranslations('pages.emoji');
  const listboxId = useId();
  const describeEmojiCandidate = (entry: PageEmojiEntry): string => `${entry.character} ${entry.names[0] ?? ''}`;
  const pendingCaretRef = useRef<number | null>(null);
  const [triggerQuery, setTriggerQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const candidates = useMemo(() => (triggerQuery === null ? [] : findEmojiCandidates(triggerQuery)), [triggerQuery]);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null || pendingCaretRef.current === null || input.value !== value) return;
    input.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current);
    pendingCaretRef.current = null;
  }, [inputRef, value]);

  const syncTrigger = (input: HTMLInputElement): void => {
    const caret = input.selectionStart ?? input.value.length;
    setTriggerQuery(getEmojiMenuQuery(input.value.slice(0, caret)));
    setSelectedIndex(0);
  };

  const closeTrigger = (): void => {
    setTriggerQuery(null);
    setSelectedIndex(0);
  };

  const chooseEmoji = (character: string): void => {
    const input = inputRef.current;
    if (input === null || triggerQuery === null) return;
    const caret = input.selectionStart ?? value.length;
    const triggerStart = caret - triggerQuery.length - 1;
    if (triggerStart < 0) return;
    pendingCaretRef.current = triggerStart + character.length;
    onChange(`${value.slice(0, triggerStart)}${character}${value.slice(caret)}`);
    closeTrigger();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
    syncTrigger(event.target);
  };

  const moveSelectedIndex = (direction: 1 | -1): void => {
    if (candidates.length === 0) return;
    setSelectedIndex((previous) => (previous + direction + candidates.length) % candidates.length);
  };

  const chooseHighlightedCandidate = (): void => {
    const candidate = candidates[selectedIndex];
    if (candidate !== undefined) chooseEmoji(candidate.character);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (triggerQuery === null) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      onLeave();
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeTrigger();
        return;
      case 'ArrowDown':
        event.preventDefault();
        moveSelectedIndex(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveSelectedIndex(-1);
        return;
      case 'Enter':
        event.preventDefault();
        chooseHighlightedCandidate();
        return;
      default:
    }
  };

  const isOpen = triggerQuery !== null;
  const activeCandidate = candidates[selectedIndex];
  const listboxOpen = isOpen && activeCandidate !== undefined;
  const comboboxAttributes = listboxOpen
    ? {
        'aria-activedescendant': `${listboxId}-${selectedIndex}`,
        'aria-controls': listboxId,
        'aria-expanded': true as const,
        role: 'combobox' as const,
      }
    : {};

  return (
    <div className="relative">
      <input
        {...comboboxAttributes}
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        id={id}
        onBlur={closeTrigger}
        onChange={handleChange}
        onClick={(event) => syncTrigger(event.currentTarget)}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (triggerQuery !== null) syncTrigger(event.currentTarget);
        }}
        placeholder={placeholder}
        ref={inputRef}
        value={value}
      />
      {isOpen &&
        (candidates.length === 0 ? (
          <p className="absolute top-full left-0 z-10 mt-1 border border-border bg-surface px-3 py-2 text-muted-foreground text-sm">
            {t('none')}
          </p>
        ) : (
          <div
            aria-label={t('candidates')}
            className="absolute top-full left-0 z-10 mt-1 max-h-64 w-64 overflow-y-auto border border-border bg-surface p-1 shadow-lg"
            id={listboxId}
            role="listbox"
          >
            {candidates.map((candidate, index) => (
              <button
                aria-selected={index === selectedIndex}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary/10 aria-selected:text-primary"
                id={`${listboxId}-${index}`}
                key={candidate.character}
                onClick={() => chooseEmoji(candidate.character)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                {describeEmojiCandidate(candidate)}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
};
