import { NOTIFICATIONS_PAGE_SIZE_MAX } from '@neuma/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListNotificationsDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(NOTIFICATIONS_PAGE_SIZE_MAX)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly = false;
}
