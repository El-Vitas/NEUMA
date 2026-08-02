import { DatabaseTemplate } from '@company-brain/db';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDatabaseDto {
  @IsString()
  spaceId!: string;

  @IsString()
  @MaxLength(120)
  @MinLength(1)
  name!: string;

  @IsString()
  @MaxLength(80)
  @MinLength(1)
  slug!: string;

  @IsIn([DatabaseTemplate.TASKS, DatabaseTemplate.PROJECTS, DatabaseTemplate.CUSTOM])
  template!: DatabaseTemplate;
}
