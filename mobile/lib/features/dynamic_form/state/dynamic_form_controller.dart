import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/db/form_draft_repository.dart';
import '../../../core/models/common.dart';
import '../../../core/models/form_template.dart';
import '../../../core/models/form_template_repository.dart';
import '../../../core/models/scoring.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../../../core/utils/local_id.dart';
import '../models/form_draft.dart';

/// Étape courante de l'écran de saisie dynamique.
enum DynamicFormStep { identification, section, synthesis }

/// Contrôleur d'état de [DynamicFormScreen] (Provider / ChangeNotifier).
///
/// Charge le template + un brouillon (existant ou nouveau), expose l'état
/// de saisie courant et calcule les scores en temps réel. Chaque
/// modification déclenche une sauvegarde locale (SQLite) — immédiate pour
/// les actions discrètes (note, signature, ajout/suppression), et à peine
/// différée (300 ms) pour la saisie de texte, afin de ne jamais perdre de
/// données en cas de fermeture de l'application ou de coupure de courant
/// tout en évitant une écriture disque à chaque frappe.
class DynamicFormController extends ChangeNotifier {
  DynamicFormController({
    required FormCode formCode,
    String? draftId,
    FormTemplateRepository templateRepository = const FormTemplateRepository(),
    FormDraftRepository draftRepository = const FormDraftRepository(),
    SyncQueueRepository syncQueueRepository = const SyncQueueRepository(),
    this.onQueueChanged,
  }) : _formCode = formCode,
       _requestedDraftId = draftId,
       _templateRepository = templateRepository,
       _draftRepository = draftRepository,
       _syncQueueRepository = syncQueueRepository {
    _initialize();
  }

  final FormCode _formCode;
  final String? _requestedDraftId;
  final FormTemplateRepository _templateRepository;
  final FormDraftRepository _draftRepository;
  final SyncQueueRepository _syncQueueRepository;

  /// Appelé après chaque ajout à la file de synchronisation — permet à
  /// `SyncEngine` de tenter une synchronisation immédiate si l'appareil
  /// est déjà en ligne, sans coupler ce contrôleur à son implémentation.
  final VoidCallback? onQueueChanged;

  Timer? _debounce;

  bool isLoading = true;
  Object? loadError;

  late FormTemplate _template;
  late FormDraft _draft;

  /// Index de l'étape courante (0 = identification, 1..N = sections,
  /// N+1 = synthèse). Distinct de l'index dans `template.sections`.
  int _stepIndex = 0;

  FormTemplate get template => _template;
  FormDraft get draft => _draft;

  int get stepIndex => _stepIndex;

  int get totalSteps => _template.sections.length + 2;

  DynamicFormStep get currentStep {
    if (_stepIndex == 0) return DynamicFormStep.identification;
    if (_stepIndex == totalSteps - 1) return DynamicFormStep.synthesis;
    return DynamicFormStep.section;
  }

  /// Section affichée à l'étape courante — valide uniquement quand
  /// [currentStep] vaut [DynamicFormStep.section].
  FormSectionTemplate get currentSection => _template.sections[_stepIndex - 1];

  Future<void> _initialize() async {
    try {
      final template = await _templateRepository.load(_formCode);
      FormDraft? draft;
      if (_requestedDraftId != null) {
        draft = await _draftRepository.findById(_requestedDraftId);
      }
      draft ??= await _draftRepository.findLatestOpenDraft(_formCode);
      final isNewDraft = draft == null;
      draft ??= _newDraft(template);

      _template = template;
      _draft = draft;
      isLoading = false;
      if (isNewDraft) {
        await _draftRepository.save(_draft);
        unawaited(_enqueueSync(SyncAction.nouveauFormulaire));
      }
      notifyListeners();
    } catch (error) {
      loadError = error;
      isLoading = false;
      notifyListeners();
    }
  }

  FormDraft _newDraft(FormTemplate template) {
    final now = DateTime.now();
    return FormDraft(
      id: generateLocalId('draft'),
      formCode: _formCode,
      templateId: template.id,
      templateVersion: template.version,
      header: {},
      sections: template.sections.map((s) => SectionDraft(sectionId: s.id)).toList(),
      signatures: template.signatures.roles.map((r) => SignatureDraft(role: r.role)).toList(),
      status: DraftStatus.brouillon,
      createdAt: now,
      updatedAt: now,
    );
  }

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------

  void goToStepIndex(int index) {
    if (index < 0 || index >= totalSteps) return;
    _stepIndex = index;
    notifyListeners();
  }

  void nextStep() => goToStepIndex(_stepIndex + 1);

  void previousStep() => goToStepIndex(_stepIndex - 1);

  bool get canGoNext => _stepIndex < totalSteps - 1;

  bool get canGoPrevious => _stepIndex > 0;

  // ---------------------------------------------------------------------
  // En-tête (identification)
  // ---------------------------------------------------------------------

  /// Ne notifie pas les listeners : le champ d'en-tête gère déjà son
  /// propre `TextEditingController`, un `notifyListeners()` à chaque
  /// frappe ne ferait que reconstruire inutilement tout l'écran (jusqu'à
  /// 67 critères sur une section) sans rien changer à l'affichage.
  /// La sauvegarde différée (300 ms) garantit tout de même la persistance.
  void updateHeaderField(String key, dynamic value) {
    final header = Map<String, dynamic>.from(_draft.header)..[key] = value;
    _draft = _draft.copyWith(header: header, updatedAt: DateTime.now());
    _persistDebounced(SyncAction.miseAJour);
  }

  // ---------------------------------------------------------------------
  // Critères officiels
  // ---------------------------------------------------------------------

  void setCriterionScore(String sectionId, String criterionId, int score) {
    final section = _draft.sectionFor(sectionId);
    final criteria = Map<String, CriterionDraft>.from(section.criteria);
    final current = criteria[criterionId] ?? const CriterionDraft();
    criteria[criterionId] = current.copyWith(score: score);
    _draft = _draft.withSection(section.copyWith(criteria: criteria));
    _persistNow(SyncAction.miseAJour);
    notifyListeners();
  }

  /// Ne notifie pas les listeners — voir [updateHeaderField].
  void setCriterionObservation(String sectionId, String criterionId, String observation) {
    final section = _draft.sectionFor(sectionId);
    final criteria = Map<String, CriterionDraft>.from(section.criteria);
    final current = criteria[criterionId] ?? const CriterionDraft();
    criteria[criterionId] = current.copyWith(observation: observation);
    _draft = _draft.withSection(section.copyWith(criteria: criteria));
    _persistDebounced(SyncAction.miseAJour);
  }

  /// Ne notifie pas les listeners — voir [updateHeaderField].
  void setSectionAdvice(String sectionId, String advice) {
    final section = _draft.sectionFor(sectionId);
    _draft = _draft.withSection(section.copyWith(advice: advice));
    _persistDebounced(SyncAction.miseAJour);
  }

  // ---------------------------------------------------------------------
  // Observations personnalisées (distinctes des critères officiels)
  // ---------------------------------------------------------------------

  void addCustomObservation(String sectionId) {
    final section = _draft.sectionFor(sectionId);
    final updated = [...section.customObservations, CustomObservationDraft(id: generateLocalId('obs'))];
    _draft = _draft.withSection(section.copyWith(customObservations: updated));
    _persistNow(SyncAction.miseAJour);
    notifyListeners();
  }

  /// Ne notifie pas les listeners — voir [updateHeaderField].
  void updateCustomObservation(String sectionId, String observationId, {String? label, String? note}) {
    final section = _draft.sectionFor(sectionId);
    final updated = section.customObservations
        .map((o) => o.id == observationId ? o.copyWith(label: label, note: note) : o)
        .toList();
    _draft = _draft.withSection(section.copyWith(customObservations: updated));
    _persistDebounced(SyncAction.miseAJour);
  }

  void removeCustomObservation(String sectionId, String observationId) {
    final section = _draft.sectionFor(sectionId);
    final updated = section.customObservations.where((o) => o.id != observationId).toList();
    _draft = _draft.withSection(section.copyWith(customObservations: updated));
    _persistNow(SyncAction.miseAJour);
    notifyListeners();
  }

  // ---------------------------------------------------------------------
  // Signatures
  // ---------------------------------------------------------------------

  void setSignature(SignatoryRole role, String pngBase64, {String? signedByName}) {
    final signature = _draft.signatureFor(role).copyWith(
      pngBase64: pngBase64,
      signedByName: signedByName,
      signedAt: DateTime.now(),
    );
    _draft = _draft.withSignature(signature);
    _persistNow(SyncAction.signature);
    notifyListeners();
  }

  void clearSignature(SignatoryRole role) {
    _draft = _draft.withSignature(SignatureDraft(role: role));
    _persistNow(SyncAction.miseAJour);
    notifyListeners();
  }

  /// Ne notifie pas les listeners — voir [updateHeaderField].
  void setSignaturePlace(SignatoryRole role, String place) {
    final signature = _draft.signatureFor(role).copyWith(place: place);
    _draft = _draft.withSignature(signature);
    _persistDebounced(SyncAction.signature);
  }

  // ---------------------------------------------------------------------
  // Scores en temps réel
  // ---------------------------------------------------------------------

  SectionScoreResult scoreForSection(FormSectionTemplate section) {
    final draftSection = _draft.sectionFor(section.id);
    final scores = <String, int>{
      for (final entry in draftSection.criteria.entries)
        if (entry.value.score != null) entry.key: entry.value.score!,
    };
    return computeSectionScore(section: section, scores: scores, conversionTable: _template.conversionTable);
  }

  Map<String, SectionScoreResult> get allSectionScores => {
    for (final section in _template.sections) section.id: scoreForSection(section),
  };

  ConversionResult get overallScore =>
      computeSynthesisScore(template: _template, sectionScores: allSectionScores);

  /// Score cumulé brut (points marqués / points possibles) sur l'ensemble
  /// du formulaire — utilisé pour la barre de progression persistante.
  /// Record positionnel : `$1` = points marqués, `$2` = points possibles.
  (int, int) get overallRawProgress {
    var scored = 0;
    var possible = 0;
    for (final section in _template.sections) {
      final result = scoreForSection(section);
      scored += result.totalScore;
      possible += result.maxScore;
    }
    return (scored, possible);
  }

  // ---------------------------------------------------------------------
  // Soumission
  // ---------------------------------------------------------------------

  Future<void> markSubmitted() async {
    _draft = _draft.copyWith(status: DraftStatus.soumis, updatedAt: DateTime.now());
    await _draftRepository.save(_draft);
    await _enqueueSync(SyncAction.miseAJour);
    notifyListeners();
  }

  // ---------------------------------------------------------------------
  // Persistance + file de synchronisation
  // ---------------------------------------------------------------------

  void _persistNow(SyncAction action) {
    _debounce?.cancel();
    unawaited(_draftRepository.save(_draft).then((_) => _enqueueSync(action)));
  }

  void _persistDebounced(SyncAction action) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      unawaited(_draftRepository.save(_draft).then((_) => _enqueueSync(action)));
    });
  }

  Future<void> _enqueueSync(SyncAction action) async {
    await _syncQueueRepository.enqueue(_draft.id, action);
    onQueueChanged?.call();
  }

  @override
  void dispose() {
    // Persiste immédiatement toute modification encore en attente avant de
    // quitter l'écran (garantie "rien perdu"). Ne met en file que si une
    // sauvegarde différée était réellement en attente — sinon la dernière
    // action réelle avait déjà mis à jour la file, inutile de dupliquer.
    final hadPendingChange = _debounce?.isActive ?? false;
    _debounce?.cancel();
    if (hadPendingChange) {
      unawaited(_draftRepository.save(_draft).then((_) => _enqueueSync(SyncAction.miseAJour)));
    }
    super.dispose();
  }
}
