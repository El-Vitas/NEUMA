import type { PresenceEntry, PresenceReport } from '../../domain/block.live.domain.types';
import { createPresenceEntry, isPresenceActive } from '../../domain/block.live.presence.domain';
import type { BlockPresenceStore } from '../../types/block.live.types';

/** Single process: a second node would not see these entries, the same limit ADR 020 accepts for its channel. */
export class InMemoryBlockPresenceStore implements BlockPresenceStore {
  private readonly entriesByPage = new Map<string, Map<string, PresenceEntry>>();

  constructor(private readonly timeToLiveMs: number) {}

  set(report: PresenceReport & { readonly pageId: string }, now: number): void {
    const { pageId, ...entryReport } = report;
    const entries = this.entriesByPage.get(pageId) ?? new Map<string, PresenceEntry>();
    entries.set(report.connectionId, createPresenceEntry(entryReport, now, this.timeToLiveMs));
    this.entriesByPage.set(pageId, entries);
  }

  list(pageId: string, now: number): readonly PresenceEntry[] {
    const entries = this.entriesByPage.get(pageId);
    return entries === undefined ? [] : [...entries.values()].filter((entry) => isPresenceActive(entry, now));
  }

  remove(pageId: string, connectionId: string): boolean {
    const entries = this.entriesByPage.get(pageId);
    const hadEntry = entries?.delete(connectionId) === true;
    if (entries?.size === 0) this.entriesByPage.delete(pageId);
    return hadEntry;
  }

  removeConnection(connectionId: string): readonly string[] {
    return [...this.entriesByPage.keys()].filter((pageId) => this.remove(pageId, connectionId));
  }

  expire(now: number): readonly string[] {
    return [...this.entriesByPage.keys()].filter((pageId) => this.removeExpired(pageId, now));
  }

  private removeExpired(pageId: string, now: number): boolean {
    const entries = this.entriesByPage.get(pageId) ?? new Map<string, PresenceEntry>();
    const expiredConnectionIds = [...entries.values()]
      .filter((entry) => !isPresenceActive(entry, now))
      .map((entry) => entry.connectionId);
    for (const connectionId of expiredConnectionIds) this.remove(pageId, connectionId);
    return expiredConnectionIds.length > 0;
  }
}
