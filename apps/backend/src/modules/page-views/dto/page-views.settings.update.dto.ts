import { IsBoolean } from 'class-validator';

export class UpdatePageViewsSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}
