import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth/auth_session.dart';
import '../../core/subscription/subscription_api_client.dart';
import '../../core/subscription/subscription_models.dart';
import '../../core/theme/app_colors.dart';

/// Sélection de formule + paiement (PROMPT 7, points 2, 4 et 6) —
/// accessible depuis le profil utilisateur. Le paiement passe par une
/// passerelle générique (mobile money locale ou carte bancaire) : cet
/// écran ouvre la transaction (`POST /subscriptions/checkout`) et affiche
/// les instructions renvoyées, mais l'activation du compte n'a lieu qu'à
/// la confirmation asynchrone du paiement côté serveur (webhook) — voir
/// `PaymentGatewayService`. Un tirer-pour-actualiser sur le profil permet
/// de vérifier si le paiement a été confirmé.
class PlanSelectionScreen extends StatefulWidget {
  const PlanSelectionScreen({super.key});

  @override
  State<PlanSelectionScreen> createState() => _PlanSelectionScreenState();
}

class _PlanSelectionScreenState extends State<PlanSelectionScreen> {
  final _apiClient = SubscriptionApiClient();
  late Future<List<SubscriptionPlan>> _plansFuture;

  SubscriptionPlan? _selectedPlan;
  PaymentMethod _selectedMethod = PaymentMethod.mpesa;
  bool _isSubmitting = false;
  String? _confirmationMessage;

  @override
  void initState() {
    super.initState();
    final session = context.read<AuthSession>();
    _plansFuture = _apiClient.fetchPlans(session.accessToken!);
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    final plan = _selectedPlan;
    if (plan == null) return;
    setState(() {
      _isSubmitting = true;
      _confirmationMessage = null;
    });

    final session = context.read<AuthSession>();
    try {
      final instructions = await _apiClient.checkout(
        session.accessToken!,
        planCode: plan.code,
        paymentMethod: _selectedMethod,
      );
      if (!mounted) return;
      setState(() => _confirmationMessage = instructions);
    } on SubscriptionApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choisir une formule')),
      body: FutureBuilder<List<SubscriptionPlan>>(
        future: _plansFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Impossible de charger les formules. Vérifiez votre connexion.'),
              ),
            );
          }

          final plans = snapshot.data!;
          final abonnements = plans.where((p) => !p.isPack).toList();
          final packs = plans.where((p) => p.isPack).toList();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_confirmationMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.positive.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.positive.withOpacity(0.4)),
                  ),
                  child: Text(_confirmationMessage!, style: const TextStyle(color: AppColors.positive)),
                ),
                const SizedBox(height: 16),
              ],
              Text('Abonnement', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...abonnements.map((plan) => _PlanTile(
                    plan: plan,
                    selectedPlanId: _selectedPlan?.id,
                    onTap: () => setState(() => _selectedPlan = plan),
                  )),
              const SizedBox(height: 20),
              Text("Pack à l'usage (valable 6 mois)", style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...packs.map((plan) => _PlanTile(
                    plan: plan,
                    selectedPlanId: _selectedPlan?.id,
                    onTap: () => setState(() => _selectedPlan = plan),
                  )),
              const SizedBox(height: 24),
              Text('Mode de paiement', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: PaymentMethod.values.map((method) {
                  return ChoiceChip(
                    label: Text(method.label),
                    selected: _selectedMethod == method,
                    onSelected: (_) => setState(() => _selectedMethod = method),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: (_selectedPlan == null || _isSubmitting) ? null : _pay,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(_selectedPlan == null ? 'Choisissez une formule' : 'Payer ${_selectedPlan!.priceFc.toStringAsFixed(0)} FC'),
              ),
              const SizedBox(height: 8),
              const Text(
                "Le paiement est confirmé par la passerelle (M-Pesa, Orange Money, Airtel Money ou carte "
                'bancaire) après cet écran ; revenez sur votre profil et tirez vers le bas pour actualiser '
                'le statut de votre abonnement.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({required this.plan, required this.selectedPlanId, required this.onTap});

  final SubscriptionPlan plan;
  final String? selectedPlanId;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = selectedPlanId == plan.id;
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: selected ? AppColors.primary : AppColors.outline, width: selected ? 2 : 1),
      ),
      child: ListTile(
        onTap: onTap,
        title: Text(plan.label, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(_subtitle(plan)),
        trailing: Radio<String>(
          value: plan.id,
          groupValue: selectedPlanId,
          onChanged: (_) => onTap(),
        ),
      ),
    );
  }

  String _subtitle(SubscriptionPlan plan) {
    if (plan.isPack) {
      return '${plan.priceFc.toStringAsFixed(0)} FC · ${plan.packInspections} inspections · '
          '${plan.packValidityDays} jours de validité';
    }
    final period = plan.billingPeriod == 'annuel' ? 'an' : 'mois';
    return '${plan.priceFc.toStringAsFixed(0)} FC / $period · renouvellement automatique';
  }
}
