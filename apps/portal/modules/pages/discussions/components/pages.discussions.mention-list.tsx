'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { PagePersonOption } from '../../collections/types/pages.schema.types';

interface IProps {
  readonly id: string;
  readonly onChoose: (person: PagePersonOption) => void;
  readonly options: readonly PagePersonOption[];
  readonly selectedIndex: number;
}

/** The people that fit what is being typed after an `@`. Focus stays in the text, so the list is only to read. */
export const PagesDiscussionsMentionList = ({ id, onChoose, options, selectedIndex }: IProps) => {
  const t = useTranslations('pages');

  return (
    <div
      aria-label={t('discussions.mentionPeople')}
      className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-48 overflow-y-auto border border-border bg-popover text-popover-foreground shadow-md"
      id={id}
      role="listbox"
    >
      {options.length === 0 && (
        <p className="px-3 py-2 text-muted-foreground text-sm">{t('discussions.mentionNobody')}</p>
      )}
      {options.map((person, index) => (
        <div
          aria-selected={index === selectedIndex}
          className={cn(
            'flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1 text-sm',
            index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
          )}
          id={`${id}-${person.id}`}
          key={person.id}
          onMouseDown={(event) => {
            event.preventDefault();
            onChoose(person);
          }}
          role="option"
          tabIndex={-1}
        >
          <span className="font-medium">{person.name}</span>
          <span className="text-muted-foreground text-xs">{person.email}</span>
        </div>
      ))}
    </div>
  );
};
