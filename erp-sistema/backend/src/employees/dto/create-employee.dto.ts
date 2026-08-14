import { IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateEmployeeDto {
  @IsNumber()
  userId: number;

  @IsString()
  department: string;

  @IsNumber()
  @IsPositive()
  salary: number;
}
