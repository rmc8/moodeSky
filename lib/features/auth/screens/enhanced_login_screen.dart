// Package imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/features/auth/widgets/server_selection_widget.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class EnhancedLoginScreen extends ConsumerStatefulWidget {
  const EnhancedLoginScreen({super.key});

  @override
  ConsumerState<EnhancedLoginScreen> createState() => _EnhancedLoginScreenState();
}

class _EnhancedLoginScreenState extends ConsumerState<EnhancedLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  
  ServerConfig _selectedServer = ServerPresets.blueskyOfficial;
  AuthMethod _authMethod = AuthMethod.appPassword;
  bool _isPasswordVisible = false;
  bool _isLoading = false;
  bool _rememberServer = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool get _isAppPasswordFormat {
    final password = _passwordController.text;
    // App Password format: 4 groups of 4 alphanumeric characters separated by hyphens
    final appPasswordRegex = RegExp(r'^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$');
    return appPasswordRegex.hasMatch(password);
  }

  bool get _showAppPasswordWarning {
    return _authMethod == AuthMethod.appPassword && 
           _passwordController.text.isNotEmpty && 
           !_isAppPasswordFormat;
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final credentials = AuthCredentials(
        identifier: _identifierController.text.trim(),
        password: _passwordController.text,
        serviceUrl: _selectedServer.serviceUrl,
        method: _authMethod,
      );

      final success = await ref.read(authNotifierProvider.notifier).login(credentials);
      
      if (success) {
        // Save server preference if user chose to remember
        if (_rememberServer && _selectedServer.isCustom) {
          // TODO: Save to SharedPreferences
        }
        
        if (mounted) {
          // Navigation will be handled by the auth state listener
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ログインに成功しました'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ログインに失敗しました: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openAppPasswordUrl() async {
    final url = Uri.parse(_selectedServer.appPasswordUrl);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ブラウザを開けませんでした: ${_selectedServer.appPasswordUrl}'),
            backgroundColor: Colors.orange,
            action: SnackBarAction(
              label: 'コピー',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: _selectedServer.appPasswordUrl));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('URLをクリップボードにコピーしました')),
                );
              },
            ),
          ),
        );
      }
    }
  }

  Future<void> _startOAuthFlow() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // TODO: Implement OAuth flow
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OAuth機能は開発中です'),
          backgroundColor: Colors.blue,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('OAuthエラー: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MoodeSky ログイン'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // App logo and title
                const Icon(
                  Icons.cloud_queue,
                  size: 80,
                  color: Colors.blue,
                ),
                const SizedBox(height: 16),
                Text(
                  'MoodeSky',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Bluesky client with deck-based UI',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 32),
                
                // Server selection
                ServerSelectionWidget(
                  initialServer: _selectedServer,
                  onServerSelected: (server) {
                    setState(() {
                      _selectedServer = server;
                    });
                  },
                ),
                
                const SizedBox(height: 24),
                
                // Authentication method selection
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.login, color: Theme.of(context).primaryColor),
                            const SizedBox(width: 8),
                            Text(
                              'ログイン方法',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Authentication method tabs
                        Row(
                          children: [
                            if (_selectedServer.supportsAppPasswords)
                              Expanded(
                                child: ChoiceChip(
                                  label: const Text('App Password'),
                                  selected: _authMethod == AuthMethod.appPassword,
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _authMethod = AuthMethod.appPassword;
                                      });
                                    }
                                  },
                                ),
                              ),
                            
                            if (_selectedServer.supportsAppPasswords && _selectedServer.supportsOAuth)
                              const SizedBox(width: 8),
                            
                            if (_selectedServer.supportsOAuth)
                              Expanded(
                                child: ChoiceChip(
                                  label: const Text('OAuth'),
                                  selected: _authMethod == AuthMethod.oauth,
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _authMethod = AuthMethod.oauth;
                                      });
                                    }
                                  },
                                ),
                              ),
                          ],
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Authentication form based on selected method
                        if (_authMethod == AuthMethod.appPassword) ...[
                          // App Password login form
                          TextFormField(
                            controller: _identifierController,
                            decoration: const InputDecoration(
                              labelText: 'ハンドル or メールアドレス',
                              hintText: '@username.bsky.social',
                              prefixIcon: Icon(Icons.account_circle),
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'ハンドルまたはメールアドレスを入力してください';
                              }
                              return null;
                            },
                          ),
                          
                          const SizedBox(height: 16),
                          
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: 'App Password',
                              hintText: 'xxxx-xxxx-xxxx-xxxx',
                              prefixIcon: const Icon(Icons.password),
                              suffixIcon: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      _isPasswordVisible ? Icons.visibility_off : Icons.visibility,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _isPasswordVisible = !_isPasswordVisible;
                                      });
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.open_in_new),
                                    onPressed: _openAppPasswordUrl,
                                    tooltip: 'App Passwordを生成',
                                  ),
                                ],
                              ),
                              border: const OutlineInputBorder(),
                            ),
                            obscureText: !_isPasswordVisible,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _login(),
                            onChanged: (_) => setState(() {}), // Trigger rebuild for warning
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'App Passwordを入力してください';
                              }
                              return null;
                            },
                          ),
                          
                          // App Password warning and help
                          if (_showAppPasswordWarning) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.orange.withValues(alpha: 0.1),
                                border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.warning, color: Colors.orange, size: 20),
                                      const SizedBox(width: 8),
                                      const Text(
                                        'セキュリティ警告',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.orange,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    '通常のパスワードが入力されているようです。セキュリティのため、App Passwordの使用を強く推奨します。',
                                    style: TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          
                          const SizedBox(height: 12),
                          
                          // App Password generation link
                          Container(
                            padding: const EdgeInsets.all(12),
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
                                      'App Passwordについて',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'App Passwordは通常のパスワードより安全で、アプリ専用のアクセストークンです。',
                                  style: TextStyle(fontSize: 12),
                                ),
                                const SizedBox(height: 8),
                                TextButton.icon(
                                  onPressed: _openAppPasswordUrl,
                                  icon: const Icon(Icons.open_in_new, size: 16),
                                  label: const Text('App Passwordを生成'),
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Login button
                          FilledButton(
                            onPressed: _isLoading ? null : _login,
                            child: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('ログイン'),
                          ),
                        ] else ...[
                          // OAuth login
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.security,
                                  size: 48,
                                  color: Theme.of(context).primaryColor,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'OAuthによる安全なログイン',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'ブラウザが開き、${_selectedServer.displayName}でのログインが求められます。',
                                  style: Theme.of(context).textTheme.bodySmall,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 16),
                                FilledButton.icon(
                                  onPressed: _isLoading ? null : _startOAuthFlow,
                                  icon: _isLoading
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : const Icon(Icons.open_in_new),
                                  label: const Text('ブラウザでログイン'),
                                ),
                              ],
                            ),
                          ),
                        ],
                        
                        // Remember server option
                        if (_selectedServer.isCustom) ...[
                          const SizedBox(height: 16),
                          CheckboxListTile(
                            title: const Text('このサーバーを記憶する'),
                            subtitle: const Text('次回ログイン時にサーバーが選択された状態になります'),
                            value: _rememberServer,
                            onChanged: (value) {
                              setState(() {
                                _rememberServer = value ?? true;
                              });
                            },
                            contentPadding: EdgeInsets.zero,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}