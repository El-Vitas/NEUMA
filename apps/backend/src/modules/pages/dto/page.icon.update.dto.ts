import type { PageIcon } from '@company-brain/shared';
import { IsOptional } from 'class-validator';

export class UpdatePageIconDto {
  @IsOptional()
  icon?: null | PageIcon;
}
