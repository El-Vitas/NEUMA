import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject } from 'class-validator';
import { MAX_APPENDED_PAGE_BLOCKS } from '../constants/pages.constants';

/** El contenido entero de una página, que reemplaza al que tiene. Su forma la valida el contrato de una página. */
export class ReplacePageContentDto {
  @IsObject()
  content!: Record<string, unknown>;
}

/** Bloques que se agregan al final de una página. Su forma la valida el contrato de una página. */
export class AppendPageBlocksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_APPENDED_PAGE_BLOCKS)
  @IsObject({ each: true })
  blocks!: Record<string, unknown>[];
}
