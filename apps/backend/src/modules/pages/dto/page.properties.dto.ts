import { IsObject } from 'class-validator';

export class UpdatePagePropertiesDto {
  /** Only the changed properties; each value is validated against the collection schema later. */
  @IsObject()
  propertyValues!: Record<string, unknown>;
}
