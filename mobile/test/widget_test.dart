import 'package:c3_digital/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App boots and shows the app bar title', (tester) async {
    await tester.pumpWidget(const C3DigitalApp());

    expect(find.text('c3-digital'), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
