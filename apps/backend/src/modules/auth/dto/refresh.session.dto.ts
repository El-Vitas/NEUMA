import { IsString, MaxLength, MinLength } from 'class-validator';
import { REFRESH_TOKEN_MAX_LENGTH, REFRESH_TOKEN_MIN_LENGTH } from '../../../common/constants/validation.constants';

export class RefreshSessionDto {
  @IsString()
  @MaxLength(REFRESH_TOKEN_MAX_LENGTH)
  @MinLength(REFRESH_TOKEN_MIN_LENGTH)
  refreshToken!: string;
}
