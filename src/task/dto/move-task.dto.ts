import { IsUUID, IsNotEmpty } from 'class-validator';

export class MoveTaskDto {
  @IsUUID()
  @IsNotEmpty()
  targetColumnId: string;
}