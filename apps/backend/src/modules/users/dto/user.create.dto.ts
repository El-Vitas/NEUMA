import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_ROLE_VALUES,
  type UserRole,
} from '@neuma/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from '../../../common/constants/validation.constants';
import { normalizeEmail, trimText } from '../../../common/utils/normalize.utils';

export class CreateUserDto {
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string;

  @IsString()
  @Transform(({ value }) => trimText(value))
  @MaxLength(NAME_MAX_LENGTH)
  @MinLength(NAME_MIN_LENGTH)
  name!: string;

  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @IsIn(USER_ROLE_VALUES)
  role!: UserRole;
}
