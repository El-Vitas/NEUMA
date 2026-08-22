import { IsString, ValidateIf } from 'class-validator';

export class SetPageOwnerDto {
  /**
   * Who answers for the page, or nothing to say nobody does.
   *
   * Saying nothing is a decision here, so it has to be said: leaving the field
   * out is not the same as handing the page back, and only one of the two is
   * being asked for.
   */
  @ValidateIf((dto: SetPageOwnerDto) => dto.ownerId !== null)
  @IsString()
  ownerId!: null | string;
}
