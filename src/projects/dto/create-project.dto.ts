import {IsString, IsNotEmpty} from "class-validator";

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}