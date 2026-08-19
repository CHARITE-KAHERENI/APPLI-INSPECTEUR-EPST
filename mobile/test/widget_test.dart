import 'package:c3_digital/core/auth/auth_session.dart';
import 'package:c3_digital/core/sync/sync_engine.dart';
import 'package:c3_digital/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('App boots and shows the app bar title', (tester) async {
    // Mêmes providers que `main()` (SyncEngine, AuthSession) — sans eux,
    // `SyncStatusBanner` (affiché en permanence, voir `C3DigitalApp`)
    // lève une `ProviderNotFoundException` dès le premier `pump`.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<SyncEngine>(create: (_) => SyncEngine()),
          ChangeNotifierProvider<AuthSession>(create: (_) => AuthSession()),
        ],
        child: const C3DigitalApp(),
      ),
    );
    await tester.pump();

    expect(find.text('c3-digital'), findsOneWidget);
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
