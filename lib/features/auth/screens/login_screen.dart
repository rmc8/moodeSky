// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/core/theme/app_themes.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/models/auth_models.dart';
import 'package:moodesky/shared/widgets/language_selector.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? initialIdentifier;
  final ServerConfig? initialServer;
  final bool isReauth;

  const LoginScreen({
    super.key,
    this.initialIdentifier,
    this.initialServer,
    this.isReauth = false,
  });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _useOAuth = false; // Toggle between OAuth and App Password
  bool _useRealOAuth = true; // Toggle between mock and real OAuth
  ServerConfig _selectedServer = ServerPresets.blueskyOfficial;

  @override
  void initState() {
    super.initState();

    // 初期値を設定
    if (widget.initialIdentifier != null) {
      _identifierController.text = widget.initialIdentifier!;
    }

    if (widget.initialServer != null) {
      _selectedServer = widget.initialServer!;
    }
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      if (_useOAuth) {
        // OAuth sign in
        await ref
            .read(authNotifierProvider.notifier)
            .signInWithOAuth(
              userIdentifier: _identifierController.text.trim(),
              useRealOAuth: _useRealOAuth,
            );
      } else {
        // App password sign in
        await ref
            .read(authNotifierProvider.notifier)
            .signInWithAppPassword(
              identifier: _identifierController.text.trim(),
              password: _passwordController.text,
            );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    // Show loading if auth is in progress
    if (authState is AuthLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppThemes.getSystemUiOverlayStyle(context),
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          systemOverlayStyle: AppThemes.getSystemUiOverlayStyle(context),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: LanguageSelector(isCompact: true, showLabel: false),
            ),
          ],
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo
                      Container(
                        margin: const EdgeInsets.only(bottom: 32),
                        child: Column(
                          children: [
                            Text(
                              'moodeSky',
                              style: Theme.of(context).textTheme.headlineLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                  ),
                            ),
                            if (widget.isReauth) ...[
                              const SizedBox(height: 8),
                              Text(
                                '再認証',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.secondary,
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      // Auth method toggle
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.loginMethod,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              SegmentedButton<bool>(
                                segments: [
                                  ButtonSegment(
                                    value: false,
                                    label: Text(
                                      AppLocalizations.of(
                                        context,
                                      )!.authMethodAppPassword,
                                    ),
                                    icon: const Icon(Icons.key),
                                  ),
                                  ButtonSegment(
                                    value: true,
                                    label: Text(
                                      AppLocalizations.of(
                                        context,
                                      )!.authMethodOAuth,
                                    ),
                                    icon: const Icon(Icons.security),
                                  ),
                                ],
                                selected: {_useOAuth},
                                onSelectionChanged: (selection) {
                                  setState(() {
                                    _useOAuth = selection.first;
                                    _passwordController.clear();
                                  });
                                },
                              ),
                              const SizedBox(height: 8),
                              // Method explanation
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: _useOAuth
                                      ? Colors.orange.withValues(alpha: 0.1)
                                      : Colors.blue.withValues(alpha: 0.1),
                                  border: Border.all(
                                    color: _useOAuth
                                        ? Colors.orange.withValues(alpha: 0.3)
                                        : Colors.blue.withValues(alpha: 0.3),
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          _useOAuth
                                              ? Icons.info
                                              : Icons.check_circle,
                                          color: _useOAuth
                                              ? Colors.orange
                                              : Colors.blue,
                                          size: 16,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _useOAuth
                                                ? 'OAuth認証モードです。モックまたは実際の認証を選択できます。'
                                                : AppLocalizations.of(
                                                    context,
                                                  )!.appPasswordRecommended,
                                            style: TextStyle(
                                              color: _useOAuth
                                                  ? Colors.orange
                                                  : Colors.blue,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    // OAuth設定詳細（OAuth選択時のみ表示）
                                    if (_useOAuth) ...[
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Checkbox(
                                            value: _useRealOAuth,
                                            onChanged: (value) {
                                              setState(() {
                                                _useRealOAuth = value ?? false;
                                              });
                                            },
                                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              '実際のOAuth認証を使用 (実験的)',
                                              style: TextStyle(
                                                color: Colors.orange.withValues(alpha: 0.8),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        _useRealOAuth 
                                            ? '実際のBluesky OAuth認証フローを使用します。'
                                            : 'テスト用モック認証を使用します。',
                                        style: TextStyle(
                                          color: Colors.orange.withValues(alpha: 0.7),
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Server selection
                      Card(
                        child: ExpansionTile(
                          leading: Icon(
                            _selectedServer.isOfficial
                                ? Icons.verified
                                : Icons.dns,
                            color: _selectedServer.isOfficial
                                ? Colors.blue
                                : Colors.grey[600],
                          ),
                          title: Text(_selectedServer.displayName),
                          subtitle: Text(
                            Uri.parse(_selectedServer.serviceUrl).host,
                          ),
                          children: [
                            for (final server
                                in ServerPresets.predefinedServers)
                              Builder(
                                builder: (context) {
                                  final isSelected =
                                      server.serviceUrl ==
                                      _selectedServer.serviceUrl;
                                  return ListTile(
                                    leading: Icon(
                                      server.isOfficial
                                          ? Icons.verified
                                          : Icons.dns,
                                      color: server.isOfficial
                                          ? Colors.blue
                                          : Colors.grey[600],
                                    ),
                                    title: Text(
                                      server.displayName,
                                      style: TextStyle(
                                        fontWeight: server.isOfficial
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                      ),
                                    ),
                                    subtitle: Text(
                                      Uri.parse(server.serviceUrl).host,
                                    ),
                                    trailing: isSelected
                                        ? const Icon(
                                            Icons.check,
                                            color: Colors.blue,
                                          )
                                        : null,
                                    selected: isSelected,
                                    onTap: () {
                                      setState(() {
                                        _selectedServer = server;
                                      });
                                    },
                                  );
                                },
                              ),
                            ListTile(
                              leading: const Icon(Icons.add),
                              title: Text(
                                AppLocalizations.of(
                                  context,
                                )!.customServerOption,
                              ),
                              subtitle: Text(
                                AppLocalizations.of(
                                  context,
                                )!.customServerDescription,
                              ),
                              onTap: () {
                                // TODO: カスタムサーバー追加ダイアログ
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      AppLocalizations.of(
                                        context,
                                      )!.customServerComingSoon,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Identifier field
                      TextFormField(
                        controller: _identifierController,
                        decoration: InputDecoration(
                          labelText: AppLocalizations.of(
                            context,
                          )!.identifierLabel,
                          hintText: AppLocalizations.of(
                            context,
                          )!.identifierHint,
                          prefixIcon: const Icon(Icons.person),
                          border: const OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: _useOAuth
                            ? TextInputAction.done
                            : TextInputAction.next,
                        validator: (value) {
                          if (value?.trim().isEmpty ?? true) {
                            return AppLocalizations.of(
                              context,
                            )!.identifierRequired;
                          }
                          return null;
                        },
                      ),

                      // Password field (only for app password)
                      if (!_useOAuth) ...[
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          decoration: InputDecoration(
                            labelText: AppLocalizations.of(
                              context,
                            )!.passwordLabel,
                            hintText: AppLocalizations.of(
                              context,
                            )!.passwordHint,
                            prefixIcon: const Icon(Icons.lock),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility
                                    : Icons.visibility_off,
                              ),
                              onPressed: () {
                                setState(
                                  () => _obscurePassword = !_obscurePassword,
                                );
                              },
                            ),
                            border: const OutlineInputBorder(),
                          ),
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          validator: (value) {
                            if (value?.trim().isEmpty ?? true) {
                              return AppLocalizations.of(
                                context,
                              )!.passwordRequired;
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 8),

                        // App Password help and warning
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.1),
                            border: Border.all(
                              color: Colors.blue.withValues(alpha: 0.3),
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.info,
                                    color: Colors.blue,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    AppLocalizations.of(
                                      context,
                                    )!.aboutAppPassword,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.blue,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                AppLocalizations.of(
                                  context,
                                )!.appPasswordDescription,
                                style: const TextStyle(fontSize: 11),
                              ),
                              const SizedBox(height: 6),
                              InkWell(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        _selectedServer.appPasswordUrl,
                                      ),
                                      action: SnackBarAction(
                                        label: AppLocalizations.of(
                                          context,
                                        )!.copyButton,
                                        onPressed: () {
                                          // TODO: URLをクリップボードにコピー
                                        },
                                      ),
                                    ),
                                  );
                                },
                                child: Text(
                                  AppLocalizations.of(
                                    context,
                                  )!.generateAppPassword,
                                  style: const TextStyle(
                                    color: Colors.blue,
                                    fontSize: 11,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 24),

                      // Sign in button
                      FilledButton(
                        onPressed: _isLoading ? null : _signIn,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(
                                  _useOAuth
                                      ? (_useRealOAuth ? 'OAuth でサインイン (実際)' : 'OAuth でサインイン (モック)')
                                      : AppLocalizations.of(
                                          context,
                                        )!.signInButton,
                                ),
                        ),
                      ),

                      // Error display
                      if (authState is AuthError) ...[
                        const SizedBox(height: 16),
                        Card(
                          color: Theme.of(context).colorScheme.errorContainer,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.error_outline,
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.onErrorContainer,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        AppLocalizations.of(
                                          context,
                                        )!.loginError,
                                        style: TextStyle(
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.onErrorContainer,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  authState.message,
                                  style: TextStyle(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onErrorContainer,
                                    fontSize: 14,
                                  ),
                                ),
                                // Show retry button for network errors
                                if (authState.errorType ==
                                    AuthErrorType.networkError) ...[
                                  const SizedBox(height: 12),
                                  FilledButton.tonal(
                                    onPressed: () {
                                      ref
                                          .read(authNotifierProvider.notifier)
                                          .refresh();
                                    },
                                    child: Text(
                                      AppLocalizations.of(context)!.retryButton,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 32),

                      // Help text
                      Text(
                        _useOAuth
                            ? (_useRealOAuth 
                                ? '実際のBluesky OAuth認証を使用します。有効なBlueskyハンドルを入力してください。' 
                                : 'OAuth認証（テスト用モック実装）を使用します。任意のハンドルまたはメールアドレスを入力してテストできます。')
                            : AppLocalizations.of(context)!.helpTextAppPassword,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
