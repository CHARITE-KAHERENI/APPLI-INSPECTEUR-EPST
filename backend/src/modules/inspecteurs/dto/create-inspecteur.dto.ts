import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInspecteurDto {
  @IsString()
  @MinLength(1)
  nom: string;

  @IsOptional()
  @IsString()
  sexe?: string;

  @IsOptional()
  @IsString()
  posteAttache?: string;

  /** Zone d'inspection IGE (ex: "Nord-Kivu 2"). */
  @IsOptional()
  @IsString()
  zone?: string;
}
