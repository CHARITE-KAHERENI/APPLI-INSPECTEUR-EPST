import { IsOptional, IsString } from 'class-validator';

export class QueryEtablissementDto {
  /** Recherche libre sur le nom (insensible à la casse, sous-chaîne). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  province?: string;
}
