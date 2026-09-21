import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth/auth_models.dart';
import '../../core/auth/auth_session.dart';
import '../../core/subscription/subscription_api_client.dart';
import '../../core/subscription/subscription_models.dart';
import '../../core/theme/app_colors.dart';
import '../subscription/plan_selection_screen.dart';

const _roleLabels = {
  UserRole.inspecteur: 'Inspecteur',
  UserRole.enseignant: 'Enseignant',
  UserRole.chefEtablissement: "Chef d'établissement",
  UserRole.igeAdmin: 'IGE',
  UserRole.superAdmin: 'Super administrateur',
};

const _statusLabels = {
  SubscriberStatus.essai: 'Essai gratuit',
  SubscriberStatus.actif: 'Actif',
  SubscriberStatus.lectureSeule: 'Lecture seule',
  SubscriberStatus.expire: 'Expiré',
};

const _statusColors = {
  SubscriberStatus.essai: AppColors.accent,
  SubscriberStatus.actif: AppColors.positive,
  SubscriberStatus.lectureSeule: AppColors.warning,
  SubscriberStatus.expire: AppColors.danger,
};

/// Profil utilisateur — affiche l'identité du compte connecté et, pour un
/// rôle facturable (`chef_etablissement`/`inspecteur`), l'état de son
/// abonnement avec accès à [PlanSelectionScreen] (PROMPT 7, point 6).
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _apiClient = SubscriptionApiClient();
  Future<Subscriber?>? _subscriberFuture;

  @override
  void initState() {
    super.initState();
    final session = context.read<AuthSession>();
    if (session.user?.role.isBillable ?? false) {
      _subscriberFuture = _apiClient.fetchMine(session.accessToken!);
    }
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final session = context.read<AuthSession>();
    if (session.user?.role.isBillable ?? false) {
      setState(() => _subscriberFuture = _apiClient.fetchMine(session.accessToken!));
      await _subscriberFuture;
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final user = session.user;

    if (user == null) {
      return const Scaffold(body: Center(child: Text('Non connecté.')));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
            onPressed: () => context.read<AuthSession>().logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.fullName, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(user.email, style: const TextStyle(color: AppColors.textMuted)),
                    const SizedBox(height: 8),
                    Text(_roleLabels[user.role] ?? user.role.value),
                    if (user.zone != null) Text('Zone : ${user.zone}'),
                  ],
                ),
              ),
            ),
            if (user.role.isBillable) ...[
              const SizedBox(height: 12),
              _SubscriptionCard(future: _subscriberFuture!, accessToken: session.accessToken!),
            ],
          ],
        ),
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.future, required this.accessToken});

  final Future<Subscriber?> future;
  final String accessToken;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<Subscriber?>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator()));
            }
            if (snapshot.hasError) {
              return const Text("Impossible de charger l'abonnement.");
            }

            final subscriber = snapshot.data;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('Abonnement', style: TextStyle(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    if (subscriber != null) _StatusChip(status: subscriber.status),
                  ],
                ),
                const SizedBox(height: 10),
                Text(_subscriptionSummary(subscriber), style: const TextStyle(color: AppColors.textMuted)),
                if (subscriber?.isReadOnly ?? false) ...[
                  const SizedBox(height: 8),
                  const Text(
                    "Consultation de l'historique toujours possible, mais impossible de créer de "
                    'nouvelles inspections tant qu\'aucune formule n\'est active.',
                    style: TextStyle(color: AppColors.danger, fontSize: 13),
                  ),
                ],
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PlanSelectionScreen()),
                    );
                  },
                  child: Text(subscriber?.currentPlan == null ? 'Choisir une formule' : 'Changer de formule'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  String _subscriptionSummary(Subscriber? subscriber) {
    if (subscriber == null) return 'Aucune information disponible.';
    switch (subscriber.status) {
      case SubscriberStatus.essai:
        return "Essai gratuit jusqu'au ${_formatDate(subscriber.trialEndsAt)}.";
      case SubscriberStatus.actif:
        if (subscriber.currentPlan?.isPack ?? false) {
          return '${subscriber.currentPlan!.label} — ${subscriber.packInspectionsRemaining ?? 0} inspection(s) '
              'restante(s), valable jusqu\'au ${_formatDate(subscriber.packExpiresAt)}.';
        }
        return '${subscriber.currentPlan?.label ?? 'Formule active'} — renouvellement le '
            '${_formatDate(subscriber.currentPeriodEndsAt)}.';
      case SubscriberStatus.lectureSeule:
        return "Votre essai ou votre abonnement est terminé.";
      case SubscriberStatus.expire:
        return 'Compte résilié.';
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '—';
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final SubscriberStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _statusColors[status] ?? AppColors.textMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(
        _statusLabels[status] ?? status.value,
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}
