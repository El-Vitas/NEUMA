import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { parseQueryBoolean } from '../../../common/utils/query-boolean.utils';

export class ListPagesDto {
  @IsBoolean()
  @IsOptional()
  @Transform(parseQueryBoolean)
  includeTrashed = false;
}
