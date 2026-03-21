import { IsArray, IsInt, IsNotEmpty, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RoleOrderDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @IsNotEmpty()
  @Min(3) // Custom roles are level 3 and below (Level 0, 1, 2 are permanent anchors)
  level: number;
}

export class ReorderRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleOrderDto)
  roles: RoleOrderDto[];
}
