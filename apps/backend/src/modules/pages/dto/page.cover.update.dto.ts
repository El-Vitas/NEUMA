import type { PageCoverValue } from '@company-brain/shared';
import { IsOptional } from 'class-validator';

export class UpdatePageCoverDto {
  @IsOptional()
  cover?: null | PageCoverValue;
}
