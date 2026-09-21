/// Modèle d'authentification — miroir Dart de `shared/src/types/auth.ts`
/// (voir `backend/src/modules/auth`).

/// Les 5 rôles de la plateforme. Le profil utilisateur reste utile même
/// pour un rôle non facturable (`enseignant`/`ige_admin`/`super_admin`) :
/// [AuthUser.role] détermine simplement si l'écran "Abonnement" (voir
/// `features/subscription`) a un sens pour ce compte.
enum UserRole {
  inspecteur,
  enseignant,
  chefEtablissement('chef_etablissement'),
  igeAdmin('ige_admin'),
  superAdmin('super_admin');

  const UserRole([String? value]) : _value = value;

  final String? _value;

  String get value => _value ?? name;

  static UserRole fromValue(String value) {
    return UserRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => throw ArgumentError('Rôle utilisateur inconnu: $value'),
    );
  }

  /// Seuls ces deux rôles portent un compte facturable (`subscribers`,
  /// voir PROMPT 7) — les autres n'ont ni essai ni abonnement à afficher.
  bool get isBillable => this == chefEtablissement || this == inspecteur;
}

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.zone,
    this.etablissementId,
    this.enseignantId,
    this.inspecteurId,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String,
      role: UserRole.fromValue(json['role'] as String),
      zone: json['zone'] as String?,
      etablissementId: json['etablissementId'] as String?,
      enseignantId: json['enseignantId'] as String?,
      inspecteurId: json['inspecteurId'] as String?,
    );
  }

  final String id;
  final String email;
  final String fullName;
  final UserRole role;
  final String? zone;
  final String? etablissementId;
  final String? enseignantId;
  final String? inspecteurId;

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'fullName': fullName,
    'role': role.value,
    'zone': zone,
    'etablissementId': etablissementId,
    'enseignantId': enseignantId,
    'inspecteurId': inspecteurId,
  };
}
