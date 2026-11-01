import type { PageContent } from '@neuma/shared';
import type {
  BlockSyncEngine,
  BlockTransaction,
  BlockTransactionOutcome,
} from '@/modules/pages/block-sync/types/block-sync.types';
import type { PagesAutosaveDisplayState } from '@/modules/pages/types/pages.autosave.types';
import type { PageCollaborationParticipant } from '@/modules/pages/types/pages.collaboration.types';
import type { FakeSession } from './block-sync.fake-server';

export interface EngineClient {
  readonly content: PageContent;
  readonly edit: (content: PageContent) => void;
  readonly engine: BlockSyncEngine;
  readonly participants: (readonly PageCollaborationParticipant[])[];
  readonly readOnlyCalls: number[];
  readonly replaceFault: { isActive: boolean };
  readonly replaced: PageContent[];
  readonly saveStates: PagesAutosaveDisplayState[];
  readonly session: FakeSession;
}

export interface PendingSend {
  readonly reject: (error: Error) => void;
  readonly resolve: (outcome: BlockTransactionOutcome) => void;
  readonly transaction: BlockTransaction;
}
