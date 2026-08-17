/// Modèle d'abonnement — miroir Dart de `shared/src/types/subscription.ts`
/// (voir `backend/src/modules/subscriptions`). PROMPT 7, point 6 : écran
/// de sélection de formule + paiement, accessible depuis le profil.

enum SubscriberStatus {
  essai,
  actif,
  lectureSeule('lecture_seule'),
  expire;

  const SubscriberStatus([String? value]) : _value = value;

  final String? _value;

  String get value => _value ?? name;

  static SubscriberStatus fromValue(String value) {
    return SubscriberStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => throw ArgumentError('Statut d\'abonnement inconnu: $value'),
    );
  }
}

enum PaymentMethod {
  mpesa,
  orangeMoney('orange_money'),
  airtelMoney('airtel_money'),
  carteBancaire('carte_bancaire');

  const PaymentMethod(this.value);

  final String value;

  String get label => switch (this) {
    PaymentMethod.mpesa => 'M-Pesa',
    PaymentMethod.orangeMoney => 'Orange Money',
    PaymentMethod.airtelMoney => 'Airtel Money',
    PaymentMethod.carteBancaire => 'Carte bancaire',
  };
}

class SubscriptionPlan {
  const SubscriptionPlan({
    required this.id,
    required this.code,
    required this.label,
    required this.kind,
    required this.priceFc,
    this.billingPeriod,
    this.packInspections,
    this.packValidityDays,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      code: json['code'] as String,
      label: json['label'] as String,
      kind: json['kind'] as String,
      priceFc: num.parse(json['priceFc'].toString()),
      billingPeriod: json['billingPeriod'] as String?,
      packInspections: json['packInspections'] as int?,
      packValidityDays: json['packValidityDays'] as int?,
    );
  }

  final String id;
  final String code;
  final String label;

  /// `"abonnement"` (mensuel/annuel) ou `"pack"` (pack à l'usage).
  final String kind;
  final num priceFc;
  final String? billingPeriod;
  final int? packInspections;
  final int? packValidityDays;

  bool get isPack => kind == 'pack';
}

class Subscriber {
  const Subscriber({
    required this.id,
    required this.status,
    required this.trialEndsAt,
    this.currentPlan,
    this.currentPeriodEndsAt,
    this.packInspectionsRemaining,
    this.packExpiresAt,
  });

  factory Subscriber.fromJson(Map<String, dynamic> json) {
    return Subscriber(
      id: json['id'] as String,
      status: SubscriberStatus.fromValue(json['status'] as String),
      trialEndsAt: DateTime.parse(json['trialEndsAt'] as String),
      currentPlan: json['currentPlan'] != null
          ? SubscriptionPlan.fromJson(json['currentPlan'] as Map<String, dynamic>)
          : null,
      currentPeriodEndsAt: json['currentPeriodEndsAt'] != null
          ? DateTime.parse(json['currentPeriodEndsAt'] as String)
          : null,
      packInspectionsRemaining: json['packInspectionsRemaining'] as int?,
      packExpiresAt: json['packExpiresAt'] != null ? DateTime.parse(json['packExpiresAt'] as String) : null,
    );
  }

  final String id;
  final SubscriberStatus status;
  final DateTime trialEndsAt;
  final SubscriptionPlan? currentPlan;
  final DateTime? currentPeriodEndsAt;
  final int? packInspectionsRemaining;
  final DateTime? packExpiresAt;

  bool get isReadOnly => status == SubscriberStatus.lectureSeule || status == SubscriberStatus.expire;
}
