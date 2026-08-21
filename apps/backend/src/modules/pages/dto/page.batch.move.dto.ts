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

  /** The space the pages are going to. Left out, they stay where they are. */
  @IsOptional()
  @IsString()
  targetSpaceId?: string;
}
