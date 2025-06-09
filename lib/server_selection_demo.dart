// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/features/auth/widgets/server_selection_widget.dart';

void main() {
  runApp(
    const ProviderScope(
      child: ServerSelectionDemoApp(),
    ),
  );
}

class ServerSelectionDemoApp extends StatelessWidget {
  const ServerSelectionDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MoodeSky Server Selection Demo',
      debugShowCheckedModeBanner: false,
      
      // Localization
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ja', 'JP'),
        Locale('en', 'US'),
      ],
      
      // Theme
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blueAccent,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
        ),
      ),
      
      // Dark theme
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blueAccent,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
        ),
      ),
      
      themeMode: ThemeMode.system,
      
      home: const ServerSelectionDemoScreen(),
    );
  }
}

class ServerSelectionDemoScreen extends StatefulWidget {
  const ServerSelectionDemoScreen({super.key});

  @override
  State<ServerSelectionDemoScreen> createState() => _ServerSelectionDemoScreenState();
}

class _ServerSelectionDemoScreenState extends State<ServerSelectionDemoScreen> {
  ServerConfig _selectedServer = ServerPresets.blueskyOfficial;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Server Selection Demo'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Demo header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info, color: Colors.blue, size: 20),
                      const SizedBox(width: 8),
                      const Text(
                        'MoodeSky サーバー選択デモ',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'このデモでは、サーバー選択ウィジェットの動作を確認できます。'
                    'カスタムサーバーの追加や、App Passwordリンクの生成なども含まれています。',
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Server selection widget
            ServerSelectionWidget(
              initialServer: _selectedServer,
              onServerSelected: (server) {
                setState(() {
                  _selectedServer = server;
                });
                
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('サーバーが選択されました: ${server.displayName}'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
            ),
            
            const SizedBox(height: 24),
            
            // Selected server info
            ...[
              Text(
                '選択されたサーバー情報',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('名前: ${_selectedServer.displayName}'),
                    Text('URL: ${_selectedServer.serviceUrl}'),
                    Text('OAuth: ${_selectedServer.supportsOAuth ? "対応" : "非対応"}'),
                    Text('App Password: ${_selectedServer.supportsAppPasswords ? "対応" : "非対応"}'),
                    const SizedBox(height: 8),
                    Text('App Password URL: ${_selectedServer.appPasswordUrl}'),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}