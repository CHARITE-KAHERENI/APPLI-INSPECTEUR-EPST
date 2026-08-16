import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:signature/signature.dart';

import '../../../core/theme/app_colors.dart';

/// Zone de signature tactile pour un signataire (enseignant, chef
/// d'établissement, inspecteur). Le trait est capturé en PNG puis encodé
/// en base64 pour être stocké dans le brouillon local — voir
/// `SignatureDraft`.
class SignaturePadField extends StatefulWidget {
  const SignaturePadField({
    super.key,
    required this.label,
    required this.existingPngBase64,
    required this.onSigned,
    required this.onCleared,
    this.initialPlace,
    this.onPlaceChanged,
  });

  final String label;
  final String? existingPngBase64;
  final ValueChanged<String> onSigned;
  final VoidCallback onCleared;

  /// Lieu de signature ("Fait à ..."), affiché aussi bien à l'écran que
  /// dans le PDF généré (voir `PdfSubmissionInput`/`SignatureResponse`).
  final String? initialPlace;
  final ValueChanged<String>? onPlaceChanged;

  @override
  State<SignaturePadField> createState() => _SignaturePadFieldState();
}

class _SignaturePadFieldState extends State<SignaturePadField> {
  late final SignatureController _controller;
  late final TextEditingController _placeController;

  @override
  void initState() {
    super.initState();
    _controller = SignatureController(penStrokeWidth: 3, penColor: AppColors.primary);
    _placeController = TextEditingController(text: widget.initialPlace ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    _placeController.dispose();
    super.dispose();
  }

  bool get _isSigned => widget.existingPngBase64 != null && widget.existingPngBase64!.isNotEmpty;

  Future<void> _saveSignature() async {
    if (_controller.isEmpty) return;
    final bytes = await _controller.toPngBytes();
    if (bytes == null) return;
    widget.onSigned(base64Encode(bytes));
  }

  void _clear() {
    _controller.clear();
    widget.onCleared();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(widget.label, style: Theme.of(context).textTheme.titleMedium),
            ),
            if (_isSigned)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.check_circle, color: AppColors.positive, size: 20),
              ),
            TextButton.icon(
              onPressed: _clear,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Effacer'),
            ),
          ],
        ),
        TextField(
          controller: _placeController,
          decoration: const InputDecoration(
            labelText: 'Fait à (lieu)',
            isDense: true,
          ),
          onChanged: widget.onPlaceChanged,
        ),
        const SizedBox(height: 6),
        Container(
          height: 160,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.outline),
          ),
          clipBehavior: Clip.antiAlias,
          child: _isSigned && _controller.isEmpty
              ? _SignedPreview(pngBase64: widget.existingPngBase64!)
              : Signature(controller: _controller, backgroundColor: Colors.white),
        ),
        const SizedBox(height: 4),
        if (!_isSigned || !_controller.isEmpty)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(onPressed: _saveSignature, child: const Text('Valider la signature')),
          ),
      ],
    );
  }
}

class _SignedPreview extends StatelessWidget {
  const _SignedPreview({required this.pngBase64});

  final String pngBase64;

  @override
  Widget build(BuildContext context) {
    return Image.memory(base64Decode(pngBase64), fit: BoxFit.contain);
  }
}
