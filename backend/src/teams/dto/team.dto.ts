import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Team name must be at least 3 characters long' })
  name: string;
}
export class UpdateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
