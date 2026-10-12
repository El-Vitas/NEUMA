import type { PageIcon } from '@neuma/shared';
import { IsOptional } from 'class-validator';

export class UpdateSpaceIconDto {
  @IsOptional()
  icon?: null | PageIcon;
}
