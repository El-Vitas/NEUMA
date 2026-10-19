import { type BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import type { PageContent } from '@neuma/shared';
import type { PinoLogger } from 'nestjs-pino';
import { createCollaborationGateway } from './collaboration.gateway';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContentRewrite,
  CollaborationContext,
  CollaborationGateway as CollaborationGatewayContract,
  CollaborationPersistenceAdapter,
  CollaborationShutdownResult,
  CollaborationTokenAdapter,
} from './types/collaboration.types';

@Injectable()
export class CollaborationGateway implements CollaborationGatewayContract, BeforeApplicationShutdown {
  private readonly gateway: CollaborationGatewayContract;

  constructor(
    token: CollaborationTokenAdapter,
    authorization: CollaborationAuthorizationAdapter,
    persistence: CollaborationPersistenceAdapter,
    content: CollaborationContentAdapter,
    private readonly logger: Pick<PinoLogger, 'error'>,
  ) {
    this.gateway = createCollaborationGateway({ authorization, content, persistence, token });
  }

  get server(): CollaborationGatewayContract['server'] {
    return this.gateway.server;
  }

  handleConnection(
    ...arguments_: Parameters<CollaborationGatewayContract['handleConnection']>
  ): ReturnType<CollaborationGatewayContract['handleConnection']> {
    return this.gateway.handleConnection(...arguments_);
  }

  validateDocumentName(documentName: string): string {
    return this.gateway.validateDocumentName(documentName);
  }

  assertUpdateSize(update: Uint8Array): Promise<void> {
    return this.gateway.assertUpdateSize(update);
  }

  assertStateSize(state: Uint8Array): Promise<void> {
    return this.gateway.assertStateSize(state);
  }

  authorizeUpdate(
    context: Parameters<CollaborationGatewayContract['authorizeUpdate']>[0],
    documentName: string,
    update: Uint8Array,
  ): Promise<void> {
    return this.gateway.authorizeUpdate(context, documentName, update);
  }

  authorizeMessage(
    ...message: Parameters<CollaborationGatewayContract['authorizeMessage']>
  ): ReturnType<CollaborationGatewayContract['authorizeMessage']> {
    return this.gateway.authorizeMessage(...message);
  }

  shutdown(): Promise<CollaborationShutdownResult> {
    return this.gateway.shutdown();
  }

  writePageContent(
    context: CollaborationContext,
    rewrite: CollaborationContentRewrite,
  ): ReturnType<CollaborationGatewayContract['writePageContent']> {
    return this.gateway.writePageContent(context, rewrite);
  }

  readLoadedPageContent(pageId: string): PageContent | null {
    return this.gateway.readLoadedPageContent(pageId);
  }

  /** Runs before the database pool closes (`PrismaService` closes it in `onApplicationShutdown`). */
  async beforeApplicationShutdown(): Promise<void> {
    const { unsavedDocumentNames } = await this.shutdown();
    if (unsavedDocumentNames.length > 0) {
      this.logger.error(
        { err: new Error('live documents not saved before shutdown'), unsavedDocumentNames },
        'live edits lost on shutdown',
      );
    }
  }
}
