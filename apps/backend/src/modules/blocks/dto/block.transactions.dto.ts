import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BLOCK_OPERATIONS_MAX_PER_TRANSACTION,
  BLOCK_TRANSACTION_ID_MAX_LENGTH,
  BLOCK_TRANSACTIONS_MAX_PER_REQUEST,
} from '../constants/block.transaction.constants';
import { BLOCK_ID_MAX_LENGTH } from '../constants/blocks.constants';

export class BlockTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(BLOCK_TRANSACTION_ID_MAX_LENGTH)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(BLOCK_ID_MAX_LENGTH)
  spaceId!: string;

  /** Each operation is read by its command, so only its being an object is checked here. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BLOCK_OPERATIONS_MAX_PER_TRANSACTION)
  @IsObject({ each: true })
  operations!: Record<string, unknown>[];
}

export class ApplyBlockTransactionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BLOCK_TRANSACTIONS_MAX_PER_REQUEST)
  @ValidateNested({ each: true })
  @Type(() => BlockTransactionDto)
  transactions!: BlockTransactionDto[];
}
