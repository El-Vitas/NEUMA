import { IsBoolean } from 'class-validator';

export class SetPageLockDto {
  @IsBoolean()
  locked!: boolean;
}
