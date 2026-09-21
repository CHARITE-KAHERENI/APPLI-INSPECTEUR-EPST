import 'dart:convert';

import 'package:http/http.dart' as http;

import '../api/api_config.dart';
import 'auth_models.dart';

/// Client HTTP vers `POST /auth/login` et `GET /auth/me` (voir
/// `backend/src/modules/auth`). Distinct de [SyncApiClient] : l'essentiel
/// de l'application (saisie hors-ligne, synchronisation) reste accessible
/// sans connexion — seuls le profil et l'abonnement (PROMPT 7) exigent
/// une session.
class AuthApiClient {
  AuthApiClient({http.Client? httpClient, String? baseUrl})
    : _httpClient = httpClient ?? http.Client(),
      _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _httpClient;
  final String _baseUrl;

  Future<({String accessToken, AuthUser user})> login(String email, String password) async {
    final response = await _httpClient
        .post(
          Uri.parse('$_baseUrl/auth/login'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(ApiConfig.requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        response.statusCode == 401
            ? 'Identifiants incorrects.'
            : 'Le serveur a répondu ${response.statusCode}.',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return (
      accessToken: decoded['accessToken'] as String,
      user: AuthUser.fromJson(decoded['user'] as Map<String, dynamic>),
    );
  }

  Future<AuthUser> fetchMe(String accessToken) async {
    final response = await _httpClient
        .get(
          Uri.parse('$_baseUrl/auth/me'),
          headers: {'Authorization': 'Bearer $accessToken'},
        )
        .timeout(ApiConfig.requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException('Session invalide ou expirée.', statusCode: response.statusCode);
    }

    return AuthUser.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  void dispose() => _httpClient.close();
}

class AuthApiException implements Exception {
  AuthApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'AuthApiException: $message';
}
