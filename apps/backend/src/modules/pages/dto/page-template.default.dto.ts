import { IsString, ValidateIf } from 'class-validator';

export class SetDefaultPageTemplateDto {
  /** Null takes the default away. */
  @IsString()
  @ValidateIf((dto: SetDefaultPageTemplateDto) => dto.templateId !== null)
  templateId!: null | string;
}
