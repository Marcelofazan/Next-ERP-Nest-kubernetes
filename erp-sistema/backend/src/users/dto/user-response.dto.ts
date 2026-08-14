import { Exclude, Expose, Type } from 'class-transformer';

class RoleDto {
  @Expose() id: number;
  @Expose() name: string;
}

@Exclude()
export class UserResponseDto {
  @Expose() id: number;
  @Expose() email: string;
  @Expose() @Type(() => RoleDto) role?: RoleDto;
  @Expose() created_at: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
