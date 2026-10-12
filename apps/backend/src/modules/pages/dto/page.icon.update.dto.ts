import type { PageIcon } from '@neuma/shared';
import { IsOptional } from 'class-validator';

export class UpdatePageIconDto {
  @IsOptional()
  icon?: null | PageIcon;
}
