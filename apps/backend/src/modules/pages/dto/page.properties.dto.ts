import { IsObject } from 'class-validator';

export class UpdatePagePropertiesDto {
  /**
   * Only the properties that changed. What the row already holds stays, so a
   * card dragged across a board sends the one value that moved.
   *
   * What each value may be is decided against the shape of the collection the
   * row belongs to, which this endpoint cannot know on its own.
   */
  @IsObject()
  propertyValues!: Record<string, unknown>;
}
