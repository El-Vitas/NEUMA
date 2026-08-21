import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class PageBatchTrashDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  pageIds!: string[];
}
