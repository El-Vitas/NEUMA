import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';
import type { DatabasePropertyValues } from '../types/database.types';

export class CreateDatabaseRecordDto {
  @IsString()
  @MaxLength(200)
  @MinLength(1)
  title!: string;

  @IsObject()
  propertyValues!: DatabasePropertyValues;
}
