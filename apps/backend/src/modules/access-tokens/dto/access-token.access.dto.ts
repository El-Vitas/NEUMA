import { IsObject } from 'class-validator';

export class UpdateAccessTokenAccessDto {
  /** Replaces the previous access entirely; it is not merged. */
  @IsObject()
  access!: Record<string, unknown>;
}
