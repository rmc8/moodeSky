// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class AddAccountScreen extends ConsumerStatefulWidget {
  const AddAccountScreen({super.key});

  @override
  ConsumerState<AddAccountScreen> createState() => _AddAccountScreenState();
}

class _AddAccountScreenState extends ConsumerState<AddAccountScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _useOAuth = false; // App Password default for add account
  ServerConfig _selectedServer = ServerPresets.blueskyOfficial;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _addAccount() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final result = await ref
          .read(authNotifierProvider.notifier)
          .addAccount(
            identifier: _identifierController.text.trim(),
            password: _passwordController.text,
            serverConfig: _selectedServer,
            useOAuth: _useOAuth,
          );

      result.when(
        success: (session, accountDid) {
          if (mounted) {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  AppLocalizations.of(context)!.accountAddedSuccess,
                ),
                backgroundColor: Colors.green,
              ),
            );
          }
        },
        failure: (error, errorDescription, errorType) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  AppLocalizations.of(context)!.accountAddFailed(error),
                ),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        cancelled: () {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  AppLocalizations.of(context)!.accountAddCancelled,
                ),
                backgroundColor: Colors.orange,
              ),
            );
          }
        },
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              AppLocalizations.of(context)!.accountAddFailed(e.toString()),
            ),
            backgroundColor: Colors.red,
          ),
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

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.addAccountTitle),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
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
                    // Info card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.info, color: Colors.blue, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  AppLocalizations.of(context)!.newAccountInfo,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: Colors.blue,
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              AppLocalizations.of(context)!.multiAccountInfo,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

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
                              child: Row(
                                children: [
                                  Icon(
                                    _useOAuth ? Icons.info : Icons.check_circle,
                                    color: _useOAuth
                                        ? Colors.orange
                                        : Colors.blue,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _useOAuth
                                          ? AppLocalizations.of(
                                              context,
                                            )!.oAuthInfo
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
                          for (final server in ServerPresets.predefinedServers)
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
                        hintText: AppLocalizations.of(context)!.identifierHint,
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
                          hintText: AppLocalizations.of(context)!.passwordHint,
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

                      // App Password help
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
                                Icon(Icons.info, color: Colors.blue, size: 16),
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

                    // Add account button
                    FilledButton(
                      onPressed: (_isLoading || _useOAuth) ? null : _addAccount,
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
                                    ? AppLocalizations.of(
                                        context,
                                      )!.oAuthInDevelopment
                                    : AppLocalizations.of(
                                        context,
                                      )!.addAccountButton,
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
                                      )!.accountAddError,
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
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 32),

                    // Help text
                    Text(
                      AppLocalizations.of(context)!.multiAccountHelpText,
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
    );
  }
}
