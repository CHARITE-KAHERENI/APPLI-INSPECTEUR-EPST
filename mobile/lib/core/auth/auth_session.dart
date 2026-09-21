import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_api_client.dart';
import 'auth_models.dart';

/// Session de connexion — nouvelle et additive (PROMPT 7, point 6) :
/// distincte de la saisie hors-ligne de [DynamicFormScreen] et de
/// [SyncEngine], qui restent utilisables sans connexion ni compte.
/// Persistée en local (`SharedPreferences`) pour rester connecté d'un
/// lancement à l'autre — un jeton expiré est simplement rejeté par le
/// serveur au prochain appel (`GET /auth/me`), ce qui déclenche
/// [logout].
///
/// Note sécurité : `SharedPreferences` n'est pas un stockage chiffré
/// (contrairement à `flutter_secure_storage`) ; acceptable pour cette
/// itération (le jeton a une durée de vie limitée côté serveur — voir
/// `JWT_EXPIRES_IN`), à durcir avant un déploiement en production.
class AuthSession extends ChangeNotifier {
  AuthSession({AuthApiClient? apiClient}) : _apiClient = apiClient ?? AuthApiClient();

  static const _tokenKey = 'c3digital.accessToken';
  static const _userKey = 'c3digital.authUser';

  final AuthApiClient _apiClient;

  String? _accessToken;
  AuthUser? _user;
  bool _isRestoring = true;
  String? _lastError;

  String? get accessToken => _accessToken;
  AuthUser? get user => _user;
  bool get isAuthenticated => _accessToken != null && _user != null;
  bool get isRestoring => _isRestoring;
  String? get lastError => _lastError;

  /// Restaure la session depuis le stockage local — à appeler une fois au
  /// démarrage de l'application (voir `main.dart`).
  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final userJson = prefs.getString(_userKey);
    if (token != null && userJson != null) {
      _accessToken = token;
      _user = AuthUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
    }
    _isRestoring = false;
    notifyListeners();

    // Revalide en arrière-plan (jeton potentiellement expiré) sans bloquer
    // l'affichage initial.
    if (_accessToken != null) {
      unawaited(_revalidate());
    }
  }

  Future<void> _revalidate() async {
    try {
      final refreshed = await _apiClient.fetchMe(_accessToken!);
      _user = refreshed;
      await _persist();
      notifyListeners();
    } on AuthApiException {
      await logout();
    }
  }

  Future<bool> login(String email, String password) async {
    _lastError = null;
    try {
      final result = await _apiClient.login(email, password);
      _accessToken = result.accessToken;
      _user = result.user;
      await _persist();
      notifyListeners();
      return true;
    } on AuthApiException catch (error) {
      _lastError = error.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _accessToken = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _accessToken!);
    await prefs.setString(_userKey, jsonEncode(_user!.toJson()));
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }
}
