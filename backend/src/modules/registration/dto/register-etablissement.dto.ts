import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Inscription en libre-service d'un établissement + de son compte
 * "chef d'établissement" — voir `RegistrationService.registerEtablissement`.
 * Contrairement à `POST /etablissements` (réservé ige_admin/super_admin),
 * cette route est publique : n'importe qui peut créer son école et
 * démarrer l'essai gratuit de 14 jours, comme annoncé dans PROMPT 7.
 */
export class RegisterEtablissementDto {
  @IsString()
  @MinLength(1)
  etablissementNom: string;

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

  @IsString()
  @MinLength(1)
  chefNomComplet: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  password: string;
}
