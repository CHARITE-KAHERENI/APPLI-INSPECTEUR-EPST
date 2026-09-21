import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Inscription en libre-service d'un inspecteur — voir
 * `RegistrationService.registerInspecteur`. Contrairement à
 * `POST /inspecteurs` (réservé ige_admin/super_admin), cette route est
 * publique : un inspecteur peut créer son propre compte et démarrer
 * l'essai gratuit de 14 jours, comme annoncé dans PROMPT 7.
 */
export class RegisterInspecteurDto {
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

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  password: string;
}
