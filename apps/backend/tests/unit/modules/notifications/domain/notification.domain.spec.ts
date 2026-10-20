import { describe, expect, it } from 'bun:test';
import {
  computeReadRetentionCutoff,
  listTextMentionedUserIds,
  planTextMentionRecipients,
} from '@/modules/notifications/domain/notification.domain';

const ANA_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9e';
const LUIS_ID = '0192f3a0-7c1e-7d2a-9b4e-3f5a6b7c8d9f';

const person = (userId: string, label: string) => ({ insert: { person: { label, userId } } });

describe('listTextMentionedUserIds', () => {
  it('reads the people named in the title of a text block', () => {
    const properties = { title: [{ insert: 'Hola ' }, person(ANA_ID, 'Ana'), person(LUIS_ID, 'Luis')] };

    expect(listTextMentionedUserIds(properties)).toEqual([ANA_ID, LUIS_ID]);
  });

  it('reads nothing from properties that hold no rich text', () => {
    expect(listTextMentionedUserIds({})).toEqual([]);
    expect(listTextMentionedUserIds({ title: 'texto plano' })).toEqual([]);
    expect(listTextMentionedUserIds(null)).toEqual([]);
  });
});

describe('planTextMentionRecipients', () => {
  it('tells a mentioned reader who was not told yet', () => {
    const recipients = planTextMentionRecipients({
      actorId: LUIS_ID,
      alreadyNotifiedUserIds: new Set(),
      mentionedUserIds: [ANA_ID],
      readableUserIds: new Set([ANA_ID]),
    });

    expect(recipients).toEqual([ANA_ID]);
  });

  it('skips the author, the people already told and the people who cannot read the block', () => {
    const recipients = planTextMentionRecipients({
      actorId: LUIS_ID,
      alreadyNotifiedUserIds: new Set([ANA_ID]),
      mentionedUserIds: [LUIS_ID, ANA_ID, 'sin-acceso'],
      readableUserIds: new Set([LUIS_ID, ANA_ID]),
    });

    expect(recipients).toEqual([]);
  });
});

describe('computeReadRetentionCutoff', () => {
  it('is 90 days before now', () => {
    const now = new Date('2026-10-20T12:00:00.000Z');

    expect(computeReadRetentionCutoff(now).toISOString()).toBe('2026-07-22T12:00:00.000Z');
  });
});
