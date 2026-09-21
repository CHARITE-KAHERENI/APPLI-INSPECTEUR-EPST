import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Résultat de synchronisation d'une entrée, tel que renvoyé par
/// `POST /sync/submissions` — miroir de `SyncResultDto` côté backend.
class SyncSubmissionResult {
  const SyncSubmissionResult({
    required this.localId,
    required this.submissionId,
    required this.status,
    required this.applied,
    required this.conflict,
    this.serverUpdatedAt,
    this.message,
  });

  factory SyncSubmissionResult.fromJson(Map<String, dynamic> json) {
    return SyncSubmissionResult(
      localId: json['localId'] as String,
      submissionId: json['submissionId'] as String,
      status: json['status'] as String,
      applied: json['applied'] as bool,
      conflict: json['conflict'] as bool,
      serverUpdatedAt: json['serverUpdatedAt'] as String?,
      message: json['message'] as String?,
    );
  }

  final String localId;
  final String submissionId;
  final String status;
  final bool applied;
  final bool conflict;
  final String? serverUpdatedAt;
  final String? message;

  bool get isError => status == 'error';
}

/// Une version archivée d'un formulaire (`form_submission_versions` côté
/// backend) — l'état qui existait juste avant qu'une synchronisation ne le
/// remplace par la version locale la plus récente.
class SubmissionHistoryVersion {
  const SubmissionHistoryVersion({
    required this.id,
    required this.snapshot,
    required this.isConflict,
    required this.reason,
    required this.archivedAt,
  });

  factory SubmissionHistoryVersion.fromJson(Map<String, dynamic> json) {
    return SubmissionHistoryVersion(
      id: json['id'] as String,
      snapshot: Map<String, dynamic>.from(json['snapshot'] as Map),
      isConflict: json['isConflict'] as bool? ?? false,
      reason: json['reason'] as String,
      archivedAt: DateTime.parse(json['archivedAt'] as String),
    );
  }

  final String id;
  final Map<String, dynamic> snapshot;
  final bool isConflict;
  final String reason;
  final DateTime archivedAt;
}

/// Historique consultable d'un formulaire : sa version actuelle côté
/// serveur (peut être `null` s'il n'a encore jamais été synchronisé) et
/// les versions qu'elle a remplacées, la plus récente d'abord.
class SubmissionHistory {
  const SubmissionHistory({required this.current, required this.versions});

  factory SubmissionHistory.fromJson(Map<String, dynamic> json) {
    return SubmissionHistory(
      current: json['current'] != null ? Map<String, dynamic>.from(json['current'] as Map) : null,
      versions: (json['versions'] as List<dynamic>? ?? [])
          .map((v) => SubmissionHistoryVersion.fromJson(v as Map<String, dynamic>))
          .toList(),
    );
  }

  final Map<String, dynamic>? current;
  final List<SubmissionHistoryVersion> versions;
}

/// Client HTTP vers l'API de synchronisation du backend NestJS
/// (`POST /sync/submissions`, `GET /sync/status`).
class SyncApiClient {
  SyncApiClient({http.Client? httpClient, String? baseUrl})
    : _httpClient = httpClient ?? http.Client(),
      _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _httpClient;
  final String _baseUrl;

  /// `true` si le serveur répond — vérification de joignabilité effective,
  /// au-delà de la simple présence d'une interface réseau.
  Future<bool> checkServerReachable() async {
    try {
      final response = await _httpClient
          .get(Uri.parse('$_baseUrl/sync/status'))
          .timeout(ApiConfig.requestTimeout);
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<SyncSubmissionResult>> syncSubmissions(List<Map<String, dynamic>> submissions) async {
    final response = await _httpClient
        .post(
          Uri.parse('$_baseUrl/sync/submissions'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'submissions': submissions}),
        )
        .timeout(ApiConfig.requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SyncApiException(
        'Le serveur a répondu ${response.statusCode} lors de la synchronisation.',
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded.map((r) => SyncSubmissionResult.fromJson(r as Map<String, dynamic>)).toList();
  }

  /// Historique consultable d'un formulaire (`GET
  /// /sync/submissions/:id/history`) — voir [SubmissionHistory]. Utilisé
  /// par l'écran "Historique" pour permettre à l'IGE de consulter la
  /// version serveur remplacée en cas de conflit de synchronisation.
  Future<SubmissionHistory> fetchSubmissionHistory(String submissionId) async {
    final response = await _httpClient
        .get(Uri.parse('$_baseUrl/sync/submissions/$submissionId/history'))
        .timeout(ApiConfig.requestTimeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SyncApiException(
        'Le serveur a répondu ${response.statusCode} lors de la récupération de l\'historique.',
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    return SubmissionHistory.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  void dispose() => _httpClient.close();
}

class SyncApiException implements Exception {
  SyncApiException(this.message, {this.statusCode, this.body});

  final String message;
  final int? statusCode;
  final String? body;

  @override
  String toString() => 'SyncApiException: $message';
}
