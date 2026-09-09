import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class CreateColumnDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  position!: number;
}