import { IsOptional, IsString } from 'class-validator';

export class MovePageDto {
  @IsOptional()
  @IsString()
  parentId?: string;
}
