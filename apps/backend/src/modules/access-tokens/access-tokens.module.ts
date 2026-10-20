import { Module } from '@nestjs/common';
import { ACCESS_TOKEN_PRINCIPAL_RESOLVER } from '../../common/constants/access-token.constants';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { AccessTokensController } from './access-tokens.controller';
import { AccessTokensService } from './access-tokens.service';
import { ACCESS_TOKEN_REPOSITORY } from './constants/access-tokens.constants';
import { AccessTokenRepository } from './infrastructure/persistence/access-token.repository';

@Module({
  controllers: [AccessTokensController],
  exports: [ACCESS_TOKEN_PRINCIPAL_RESOLVER, AccessTokensService],
  providers: [
    BlockAccessRepository,
    AccessTokenRepository,
    { provide: ACCESS_TOKEN_REPOSITORY, useExisting: AccessTokenRepository },
    AccessTokensService,
    { provide: ACCESS_TOKEN_PRINCIPAL_RESOLVER, useExisting: AccessTokensService },
    WorkspaceContextService,
  ],
})
export class AccessTokensModule {}
