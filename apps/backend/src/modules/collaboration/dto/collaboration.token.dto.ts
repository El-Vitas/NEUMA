import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { COLLABORATION_MODES } from '../constants/collaboration.constants';

export class CollaborationTokenDto {
  @IsUUID()
  @IsNotEmpty()
  pageId!: string;

  @IsIn(COLLABORATION_MODES)
  mode!: 'read' | 'write';
}
