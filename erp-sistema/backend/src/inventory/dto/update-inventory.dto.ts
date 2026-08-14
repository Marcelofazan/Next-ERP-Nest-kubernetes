import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  warehouse_id?: number;
}
