import { IsNotEmpty, IsString } from 'class-validator';

export class AssignUserRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
