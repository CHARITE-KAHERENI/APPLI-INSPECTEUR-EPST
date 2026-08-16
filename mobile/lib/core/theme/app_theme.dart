import 'package:flutter/material.dart';

/// Thème provisoire de l'application c3-digital.
class AppTheme {
  const AppTheme._();

  static final ThemeData light = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B5FFF)),
  );
}
