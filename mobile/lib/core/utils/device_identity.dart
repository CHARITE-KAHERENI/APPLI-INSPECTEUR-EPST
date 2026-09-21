import 'local_id.dart';

/// Identifiant de l'appareil transmis lors de la synchronisation (traçage
/// de l'origine d'un formulaire côté backend, `form_submissions.device_id`).
///
/// Généré une fois par lancement de l'application. Une prochaine itération
/// pourra le rendre durable entre les redémarrages (ex: stocké en SQLite
/// ou via `device_info_plus`) ; en attendant, un identifiant stable pour
/// la durée d'une session suffit à distinguer les synchronisations
/// concurrentes.
class DeviceIdentity {
  DeviceIdentity._();

  static final String current = generateLocalId('device');
}
