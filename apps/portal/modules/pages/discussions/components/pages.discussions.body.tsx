import type { BlockRichText } from '@neuma/shared';

interface IProps {
  readonly body: BlockRichText;
  readonly currentUserId: string | null;
}

/** A comment as plain words; a person it names stands out, and more so when it is the reader. */
export const PagesDiscussionsBody = ({ body, currentUserId }: IProps) => (
  <p className="wrap-break-word whitespace-pre-wrap font-reading text-foreground text-sm">
    {body.map((segment, index) => {
      const key = `${String(index)}`;
      if (typeof segment.insert === 'string') return <span key={key}>{segment.insert}</span>;
      if (!('person' in segment.insert)) return null;
      const { label, userId } = segment.insert.person;
      return (
        <span
          className={
            userId === currentUserId
              ? 'bg-primary/15 px-0.5 font-medium text-foreground'
              : 'px-0.5 font-medium text-primary'
          }
          data-mention-user={userId}
          key={key}
        >
          @{label}
        </span>
      );
    })}
  </p>
);
