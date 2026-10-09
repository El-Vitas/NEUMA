import { SpaceVisibility } from '@neuma/db';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @MaxLength(120)
  @MinLength(1)
  name!: string;

  @IsIn([SpaceVisibility.PUBLIC_INTERNAL, SpaceVisibility.RESTRICTED])
  visibility!: SpaceVisibility;

  @IsString()
  @MaxLength(80)
  @MinLength(1)
  slug!: string;
}
