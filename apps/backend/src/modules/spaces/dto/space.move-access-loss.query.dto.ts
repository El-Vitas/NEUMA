import { IsString } from 'class-validator';

export class SpaceMoveAccessLossQueryDto {
  @IsString()
  targetSpaceId!: string;
}
