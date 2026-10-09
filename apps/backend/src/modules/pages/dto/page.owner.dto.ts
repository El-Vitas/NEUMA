import { IsString, ValidateIf } from 'class-validator';

export class SetPageOwnerDto {
  /** `null` clears the owner; omitting the field is invalid. */
  @ValidateIf((dto: SetPageOwnerDto) => dto.ownerId !== null)
  @IsString()
  ownerId!: null | string;
}
