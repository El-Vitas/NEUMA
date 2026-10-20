export interface TextMentionPlanInput {
  readonly actorId: string;
  readonly alreadyNotifiedUserIds: ReadonlySet<string>;
  readonly mentionedUserIds: readonly string[];
  readonly readableUserIds: ReadonlySet<string>;
}
