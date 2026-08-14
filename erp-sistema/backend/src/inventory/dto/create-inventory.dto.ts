import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @IsPositive()
  warehouse_id: number;

  @IsNumber()
  @Min(0)
  quantity: number;
}
