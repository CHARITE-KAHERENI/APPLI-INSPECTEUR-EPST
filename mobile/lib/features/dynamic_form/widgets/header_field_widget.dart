import 'package:flutter/material.dart';

import '../../../core/models/common.dart';
import '../../../core/models/form_template.dart';

/// Affiche un champ d'en-tête ([FormHeaderField]) selon son type
/// (texte, texte long, date, nombre, liste déroulante) et notifie
/// [onChanged] à chaque modification.
class HeaderFieldWidget extends StatefulWidget {
  const HeaderFieldWidget({super.key, required this.field, required this.initialValue, required this.onChanged});

  final FormHeaderField field;
  final dynamic initialValue;
  final ValueChanged<dynamic> onChanged;

  @override
  State<HeaderFieldWidget> createState() => _HeaderFieldWidgetState();
}

class _HeaderFieldWidgetState extends State<HeaderFieldWidget> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue?.toString() ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _label {
    final code = widget.field.code;
    return code != null ? '$code. ${widget.field.label}' : widget.field.label;
  }

  @override
  Widget build(BuildContext context) {
    final field = widget.field;
    switch (field.type) {
      case FormFieldType.select:
        return _buildSelect(field);
      case FormFieldType.date:
        return _buildDate(field);
      case FormFieldType.number:
        return TextField(
          controller: _controller,
          keyboardType: const TextInputType.numberWithOptions(),
          decoration: InputDecoration(labelText: _label, helperText: field.helpText),
          onChanged: (value) => widget.onChanged(num.tryParse(value)),
        );
      case FormFieldType.textarea:
        return TextField(
          controller: _controller,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(labelText: _label, helperText: field.helpText),
          onChanged: widget.onChanged,
        );
      case FormFieldType.text:
        return TextField(
          controller: _controller,
          decoration: InputDecoration(labelText: _label, helperText: field.helpText),
          onChanged: widget.onChanged,
        );
    }
  }

  Widget _buildSelect(FormHeaderField field) {
    final options = field.options ?? const [];
    final currentValue = widget.initialValue as String?;
    final hasCurrentValue = options.any((o) => o.value == currentValue);
    return DropdownButtonFormField<String>(
      value: hasCurrentValue ? currentValue : null,
      decoration: InputDecoration(labelText: _label, helperText: field.helpText),
      items: [
        for (final option in options) DropdownMenuItem(value: option.value, child: Text(option.label)),
      ],
      onChanged: widget.onChanged,
    );
  }

  Widget _buildDate(FormHeaderField field) {
    return TextField(
      controller: _controller,
      readOnly: true,
      decoration: InputDecoration(
        labelText: _label,
        helperText: field.helpText,
        suffixIcon: const Icon(Icons.calendar_today_outlined, size: 20),
      ),
      onTap: () async {
        final initial = DateTime.tryParse(_controller.text) ?? DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: initial,
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (picked != null) {
          final formatted =
              '${picked.year.toString().padLeft(4, '0')}-'
              '${picked.month.toString().padLeft(2, '0')}-'
              '${picked.day.toString().padLeft(2, '0')}';
          _controller.text = formatted;
          widget.onChanged(formatted);
        }
      },
    );
  }
}
