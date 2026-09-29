import type { PageContent } from '@company-brain/shared';
import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createCollaborationGateway } from './collaboration.gateway';
import type {
  CollaborationAuthorizationAdapter,
  CollaborationContentAdapter,
  CollaborationContentRewrite,
  CollaborationContext,
  CollaborationGateway as CollaborationGatewayContract,
  CollaborationPersistenceAdapter,
  CollaborationTokenAdapter,
} from './types/collaboration.types';

@Injectable()
export class CollaborationGateway implements CollaborationGatewayContract, OnApplicationShutdown {
  private readonly gateway: CollaborationGatewayContract;

  constructor(
    token: CollaborationTokenAdapter,
    authorization: CollaborationAuthorizationAdapter,
    persistence: CollaborationPersistenceAdapter,
    content: CollaborationContentAdapter,
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

  shutdown(): Promise<void> {
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

  onApplicationShutdown(): Promise<void> {
    return this.shutdown();
  }
}
