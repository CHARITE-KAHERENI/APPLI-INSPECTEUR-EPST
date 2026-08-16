/// Un établissement scolaire, disponible hors-ligne pour faciliter la
/// saisie de l'en-tête (champ "Etablissement") — voir
/// `ReferenceDataRepository`.
class Etablissement {
  const Etablissement({
    required this.id,
    required this.nom,
    this.code,
    this.province,
    this.sousDivision,
    this.milieu,
  });

  factory Etablissement.fromJson(Map<String, dynamic> json) {
    return Etablissement(
      id: json['id'] as String,
      nom: json['nom'] as String,
      code: json['code'] as String?,
      province: json['province'] as String?,
      sousDivision: json['sousDivision'] as String?,
      milieu: json['milieu'] as String?,
    );
  }

  final String id;
  final String nom;
  final String? code;
  final String? province;
  final String? sousDivision;
  final String? milieu;
}

/// Un enseignant, rattaché à un établissement — disponible hors-ligne pour
/// faciliter la saisie de l'en-tête (champ "Enseignant").
class Enseignant {
  const Enseignant({
    required this.id,
    required this.nom,
    this.etablissementId,
    this.matiere,
    this.sexe,
  });

  factory Enseignant.fromJson(Map<String, dynamic> json) {
    return Enseignant(
      id: json['id'] as String,
      nom: json['nom'] as String,
      etablissementId: json['etablissementId'] as String?,
      matiere: json['matiere'] as String?,
      sexe: json['sexe'] as String?,
    );
  }

  final String id;
  final String nom;
  final String? etablissementId;
  final String? matiere;
  final String? sexe;
}
