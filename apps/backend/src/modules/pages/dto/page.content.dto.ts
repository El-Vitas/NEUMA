import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject } from 'class-validator';
import { MAX_APPENDED_PAGE_BLOCKS } from '../constants/pages.constants';

/** Replaces the whole content; its shape is validated by the page contract. */
export class ReplacePageContentDto {
  @IsObject()
  content!: Record<string, unknown>;
}

/** Blocks appended at the end; their shape is validated by the page contract. */
export class AppendPageBlocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_APPENDED_PAGE_BLOCKS)
  @IsObject({ each: true })
  blocks!: Record<string, unknown>[];
}
