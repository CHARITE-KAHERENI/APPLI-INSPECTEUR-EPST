import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEnseignantDto {
  @IsString()
  @MinLength(1)
  nom: string;

  @IsOptional()
  @IsString()
  sexe?: string;

  @IsOptional()
  @IsString()
  matiere?: string;

  @IsOptional()
  @IsUUID()
  etablissementId?: string;
}
