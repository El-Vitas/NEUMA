import { IsOptional, IsString } from 'class-validator';

export class SetPageOwnerDto {
  @IsOptional()
  @IsString()
  ownerId!: null | string;
}
