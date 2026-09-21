import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryEnseignantDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  etablissementId?: string;
}
