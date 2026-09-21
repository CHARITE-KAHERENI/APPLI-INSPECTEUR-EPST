import 'dart:convert';

import 'package:http/http.dart' as http;

import '../api/api_config.dart';

/// Client HTTP vers `POST /ai/writing-assistant` (voir
/// `backend/src/modules/ai`) — assistant de rédaction (PROMPT 8, point 1).
/// Nécessite une session active (jeton JWT, voir `core/auth/auth_session.dart`)
/// et une connexion internet ; `SectionStep` vérifie les deux avant
/// d'appeler ce client et affiche un message clair sinon (voir
/// `mobile/README.md`, section "Assistant de rédaction IA").
class AiApiClient {
  AiApiClient({http.Client? httpClient, String? baseUrl})
    : _httpClient = httpClient ?? http.Client(),
      _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _httpClient;
  final String _baseUrl;

  Future<String> generateWritingSuggestion({
    required String accessToken,
    required String formCode,
    required String sectionTitle,
    required String rawNotes,
    String? enseignantHistorySummary,
  }) async {
    final response = await _httpClient
        .post(
          Uri.parse('$_baseUrl/ai/writing-assistant'),
          headers: {
            'Authorization': 'Bearer $accessToken',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'formCode': formCode,
            'sectionTitle': sectionTitle,
            'rawNotes': rawNotes,
            if (enseignantHistorySummary != null) 'enseignantHistorySummary': enseignantHistorySummary,
          }),
        )
        .timeout(const Duration(seconds: 30));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AiApiException(
        response.statusCode == 503
            ? "Fonction IA indisponible pour le moment (clé non configurée côté serveur)."
            : 'Le serveur a répondu ${response.statusCode}.',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['suggestion'] as String;
  }

  void dispose() => _httpClient.close();
}

class AiApiException implements Exception {
  AiApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'AiApiException: $message';
}
