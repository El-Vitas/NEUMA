import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { PAGE_LOOKUP_CONTENT_MAX_IDS, PAGE_LOOKUP_MAX_IDS } from '../constants/pages.constants';

export class PageLookupDto {
  @IsArray()
  @ArrayMaxSize(PAGE_LOOKUP_MAX_IDS)
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  ids!: string[];
}

export class PageLookupContentDto {
  @IsArray()
  @ArrayMaxSize(PAGE_LOOKUP_CONTENT_MAX_IDS)
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  ids!: string[];
}
