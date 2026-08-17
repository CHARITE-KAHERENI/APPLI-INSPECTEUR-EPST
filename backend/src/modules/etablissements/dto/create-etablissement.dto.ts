import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEtablissementDto {
  @IsString()
  @MinLength(1)
  nom: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  sousDivision?: string;

  @IsOptional()
  @IsString()
  milieu?: string;

  /** Zone d'inspection IGE (ex: "Nord-Kivu 2"). */
  @IsOptional()
  @IsString()
  zone?: string;
}
