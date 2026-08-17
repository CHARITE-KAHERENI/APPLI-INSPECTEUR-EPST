import 'dart:convert';

import 'package:http/http.dart' as http;

import '../api/api_config.dart';
import 'subscription_models.dart';

/// Client HTTP vers `/subscriptions/*` (voir
/// `backend/src/modules/subscriptions`) — plans disponibles, abonnement du
/// compte connecté, et achat d'une formule.
class SubscriptionApiClient {
  SubscriptionApiClient({http.Client? httpClient, String? baseUrl})
    : _httpClient = httpClient ?? http.Client(),
      _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _httpClient;
  final String _baseUrl;

  Future<List<SubscriptionPlan>> fetchPlans(String accessToken) async {
    final response = await _httpClient
        .get(
          Uri.parse('$_baseUrl/subscriptions/plans'),
          headers: {'Authorization': 'Bearer $accessToken'},
        )
        .timeout(ApiConfig.requestTimeout);
    _throwIfError(response);
    final decoded = jsonDecode(response.body) as List<dynamic>;
    return decoded.map((p) => SubscriptionPlan.fromJson(p as Map<String, dynamic>)).toList();
  }

  Future<Subscriber?> fetchMine(String accessToken) async {
    final response = await _httpClient
        .get(
          Uri.parse('$_baseUrl/subscriptions/me'),
          headers: {'Authorization': 'Bearer $accessToken'},
        )
        .timeout(ApiConfig.requestTimeout);
    _throwIfError(response);
    if (response.body == 'null' || response.body.isEmpty) {
      return null;
    }
    return Subscriber.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// Ouvre une transaction auprès de la passerelle (mock — voir
  /// `PaymentGatewayService`) ; le compte n'est activé qu'à la
  /// confirmation asynchrone du paiement (webhook côté serveur), jamais
  /// immédiatement ici — voir [redirectInstructions] renvoyées à
  /// l'utilisateur.
  Future<String> checkout(String accessToken, {required String planCode, required PaymentMethod paymentMethod}) async {
    final response = await _httpClient
        .post(
          Uri.parse('$_baseUrl/subscriptions/checkout'),
          headers: {
            'Authorization': 'Bearer $accessToken',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({'planCode': planCode, 'paymentMethod': paymentMethod.value}),
        )
        .timeout(ApiConfig.requestTimeout);
    _throwIfError(response);
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['redirectInstructions'] as String;
  }

  void _throwIfError(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SubscriptionApiException(
        response.statusCode == 401
            ? 'Session expirée — reconnectez-vous.'
            : 'Le serveur a répondu ${response.statusCode}.',
        statusCode: response.statusCode,
      );
    }
  }

  void dispose() => _httpClient.close();
}

class SubscriptionApiException implements Exception {
  SubscriptionApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'SubscriptionApiException: $message';
}
