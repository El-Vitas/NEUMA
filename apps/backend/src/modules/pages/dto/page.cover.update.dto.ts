import type { PageCoverValue } from '@neuma/shared';
import { IsOptional } from 'class-validator';

export class UpdatePageCoverDto {
  @IsOptional()
  cover?: null | PageCoverValue;
}
