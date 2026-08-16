import { IsUUID, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(['admin', 'member'])
  role!: string;
}