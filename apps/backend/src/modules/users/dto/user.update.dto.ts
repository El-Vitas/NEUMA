import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@neuma/shared';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from '../../../common/constants/validation.constants';
import { trimText } from '../../../common/utils/normalize.utils';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimText(value))
  @MaxLength(NAME_MAX_LENGTH)
  @MinLength(NAME_MIN_LENGTH)
  name?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
