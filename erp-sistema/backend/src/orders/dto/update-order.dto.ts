import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: string;
}
