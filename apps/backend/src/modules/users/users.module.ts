import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [AuthModule],
  providers: [UsersService, UserRepository],
})
export class UsersModule {}
