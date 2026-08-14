import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salary?: number;
}
