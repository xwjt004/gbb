export class CreateRoleDto {
  name: string;
  description?: string;
  permissions?: string[];
}

export class UpdateRoleDto {
  name?: string;
  description?: string;
  status?: string;
  permissions?: string[];
}
