// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';

void main() {
  runApp(
    const ProviderScope(
      child: SimpleServerDemoApp(),
    ),
  );
}

class SimpleServerDemoApp extends StatelessWidget {
  const SimpleServerDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Simple Server Selection Demo',
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
      
      home: const SimpleServerDemoScreen(),
    );
  }
}

class SimpleServerDemoScreen extends StatefulWidget {
  const SimpleServerDemoScreen({super.key});

  @override
  State<SimpleServerDemoScreen> createState() => _SimpleServerDemoScreenState();
}

class _SimpleServerDemoScreenState extends State<SimpleServerDemoScreen> {
  ServerConfig _selectedServer = ServerPresets.blueskyOfficial;
  final List<ServerConfig> _servers = ServerPresets.predefinedServers;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Simple Server Selection'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'サーバーを選択:',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Server list
            Expanded(
              child: ListView.builder(
                itemCount: _servers.length,
                itemBuilder: (context, index) {
                  final server = _servers[index];
                  final isSelected = server.serviceUrl == _selectedServer.serviceUrl;
                  
                  return Card(
                    color: isSelected ? Colors.blue.withValues(alpha: 0.1) : null,
                    child: ListTile(
                      leading: Icon(
                        server.isOfficial ? Icons.verified : Icons.dns,
                        color: server.isOfficial ? Colors.blue : Colors.grey[600],
                      ),
                      title: Text(
                        server.displayName,
                        style: TextStyle(
                          fontWeight: server.isOfficial ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      subtitle: Text(Uri.parse(server.serviceUrl).host),
                      trailing: isSelected ? const Icon(Icons.check, color: Colors.blue) : null,
                      onTap: () {
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
                  );
                },
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Selected server info
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
                  Text(
                    '選択されたサーバー:',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
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
        ),
      ),
    );
  }
}