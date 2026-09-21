import { IsOptional, IsString } from 'class-validator';

export class QueryInspecteurDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  zone?: string;
}
