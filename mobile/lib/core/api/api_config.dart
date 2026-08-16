/// Configuration de l'API backend.
///
/// `10.0.2.2` est l'alias que l'émulateur Android utilise pour joindre le
/// `localhost` de la machine hôte — pratique en développement, mais **à
/// remplacer par l'URL réelle du serveur c3-digital avant tout déploiement**
/// (ex: via une variable d'environnement de build ou un écran de
/// paramètres, non couverts par cette itération).
class ApiConfig {
  const ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'C3_DIGITAL_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const Duration requestTimeout = Duration(seconds: 20);
}
