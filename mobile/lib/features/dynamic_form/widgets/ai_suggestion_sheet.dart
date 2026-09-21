import 'package:flutter/material.dart';

import '../../../core/ai/ai_api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Feuille modale de l'assistant de rédaction IA (PROMPT 8, point 1) :
/// affiche la reformulation proposée par Claude, éditable, avec
/// "Régénérer" (nouvel appel à partir des mêmes notes brutes) et
/// "Accepter" (remplace la zone "conseils" par le texte affiché — voir
/// `SectionStep._requestAiSuggestion`).
class AiSuggestionSheet extends StatefulWidget {
  const AiSuggestionSheet({
    super.key,
    required this.apiClient,
    required this.accessToken,
    required this.formCode,
    required this.sectionTitle,
    required this.rawNotes,
    required this.onAccept,
  });

  final AiApiClient apiClient;
  final String accessToken;
  final String formCode;
  final String sectionTitle;
  final String rawNotes;
  final ValueChanged<String> onAccept;

  @override
  State<AiSuggestionSheet> createState() => _AiSuggestionSheetState();
}

class _AiSuggestionSheetState extends State<AiSuggestionSheet> {
  final _suggestionController = TextEditingController();
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _generate();
  }

  @override
  void dispose() {
    _suggestionController.dispose();
    widget.apiClient.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final suggestion = await widget.apiClient.generateWritingSuggestion(
        accessToken: widget.accessToken,
        formCode: widget.formCode,
        sectionTitle: widget.sectionTitle,
        rawNotes: widget.rawNotes,
      );
      if (!mounted) return;
      setState(() {
        _suggestionController.text = suggestion;
        _isLoading = false;
      });
    } on AiApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.accent, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Suggestion IA', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _generate, child: const Text('Réessayer')),
          ] else ...[
            TextField(
              controller: _suggestionController,
              minLines: 4,
              maxLines: 10,
              decoration: const InputDecoration(
                helperText: 'Vous pouvez modifier ce texte avant de l\'accepter.',
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _generate,
                    child: const Text('Régénérer'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      widget.onAccept(_suggestionController.text);
                      Navigator.of(context).pop();
                    },
                    child: const Text('Accepter'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
