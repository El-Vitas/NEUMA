import type { PageIcon } from '@company-brain/shared';
import { IsOptional } from 'class-validator';

export class UpdateSpaceIconDto {
  @IsOptional()
  icon?: null | PageIcon;
}
