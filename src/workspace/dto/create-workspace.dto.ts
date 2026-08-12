import {IsString, IsNotEmpty} from "class-validator";

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}