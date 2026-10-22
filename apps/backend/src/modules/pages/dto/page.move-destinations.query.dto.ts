import { IsOptional, IsString, MaxLength } from 'class-validator';
import { SEARCH_MAX_QUERY_LENGTH } from '../../../common/constants/search.constants';

export class PageMoveDestinationsQueryDto {
  /** What is being looked for; empty lists the top of each space. */
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_QUERY_LENGTH)
  query = '';
}
