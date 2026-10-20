import { Injectable } from '@nestjs/common';
import type { BlockCommit, BlockCommitFeed, BlockCommitListener } from '../../common/types/block-writer.types';

/** In this process only: the listeners are other modules of the same backend. */
@Injectable()
export class BlockCommitHub implements BlockCommitFeed {
  private readonly listeners = new Set<BlockCommitListener>();

  subscribe(listener: BlockCommitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(commit: BlockCommit): void {
    for (const listener of this.listeners) listener(commit);
  }
}
