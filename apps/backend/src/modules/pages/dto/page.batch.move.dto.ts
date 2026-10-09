import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class PageBatchMoveDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  pageIds!: string[];

  @IsOptional()
  @IsString()
  parentId?: string;

  /** Omitted keeps the pages in their current space. */
  @IsOptional()
  @IsString()
  targetSpaceId?: string;
}
