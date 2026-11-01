import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BLOCK_ID_MAX_LENGTH, BLOCK_SYNC_MAX_REQUESTED_BLOCKS, BLOCK_VERSION_MAX } from '../constants/blocks.constants';

export class RequestedBlockDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(BLOCK_ID_MAX_LENGTH)
  id!: string;

  @IsInt()
  @Min(0)
  @Max(BLOCK_VERSION_MAX)
  version!: number;
}

/** Exactly one of `pageId` (a page and its subtree) or `blocks` (versions held, for catch-up). */
export class SyncBlocksDto {
  @ValidateIf((dto: SyncBlocksDto) => dto.blocks === undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(BLOCK_ID_MAX_LENGTH)
  pageId?: string;

  @ValidateIf((dto: SyncBlocksDto) => dto.pageId === undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BLOCK_SYNC_MAX_REQUESTED_BLOCKS)
  @ValidateNested({ each: true })
  @Type(() => RequestedBlockDto)
  blocks?: RequestedBlockDto[];
}
