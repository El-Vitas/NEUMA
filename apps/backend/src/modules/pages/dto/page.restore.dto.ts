import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class RestorePageDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeChildren = false;
}
