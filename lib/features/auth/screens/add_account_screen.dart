// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/models/auth_models.dart';
import 'package:moodesky/shared/widgets/common/index.dart';

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
                    CommonContainerFactories.card(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info,
                                color: context.appColors.info,
                                size: 20,
                              ),
                              AppSpacing.horizontalSpacerSM,
                              Text(
                                AppLocalizations.of(context)!.newAccountInfo,
                                style: context.appTextStyles.titleMedium
                                    .copyWith(
                                      color: context.appColors.info,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          AppSpacing.verticalSpacerSM,
                          Text(
                            AppLocalizations.of(context)!.multiAccountInfo,
                            style: context.appTextStyles.caption,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // OAuth temporarily disabled - showing info card
                    CommonContainerFactories.card(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.key,
                                color: context.appColors.info,
                                size: 20,
                              ),
                              AppSpacing.horizontalSpacerSM,
                              Text(
                                AppLocalizations.of(
                                  context,
                                )!.authMethodAppPassword,
                                style: context.appTextStyles.titleMedium
                                    .copyWith(
                                      color: context.appColors.info,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          AppSpacing.verticalSpacerSM,
                          CommonContainer(
                            style: CommonContainerStyle.none,
                            padding: AppSpacing.paddingMD,
                            color: context.appColors.infoWithOpacity,
                            borderRadius: AppBorderRadius.sm,
                            border: Border.all(
                              color: context.appColors.info.withValues(
                                alpha: 0.3,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.check_circle,
                                  color: context.appColors.info,
                                  size: 16,
                                ),
                                AppSpacing.horizontalSpacerSM,
                                Expanded(
                                  child: Text(
                                    AppLocalizations.of(
                                      context,
                                    )!.appPasswordRecommended,
                                    style: context.appTextStyles.bodySmall
                                        .copyWith(
                                          color: context.appColors.info,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Server selection
                    CommonContainerFactories.card(
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
                      textInputAction: TextInputAction.next,
                      validator: (value) {
                        if (value?.trim().isEmpty ?? true) {
                          return AppLocalizations.of(
                            context,
                          )!.identifierRequired;
                        }
                        return null;
                      },
                    ),

                    // Password field
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: AppLocalizations.of(context)!.passwordLabel,
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
                          return AppLocalizations.of(context)!.passwordRequired;
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 8),

                    // App Password help
                    CommonContainer(
                      style: CommonContainerStyle.none,
                      padding: AppSpacing.paddingMD,
                      color: context.appColors.infoWithOpacity,
                      borderRadius: AppBorderRadius.sm,
                      border: Border.all(
                        color: context.appColors.info.withValues(alpha: 0.3),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info,
                                color: context.appColors.info,
                                size: 16,
                              ),
                              AppSpacing.horizontalSpacerSM,
                              Text(
                                AppLocalizations.of(context)!.aboutAppPassword,
                                style: context.appTextStyles.labelSmall
                                    .copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: context.appColors.info,
                                    ),
                              ),
                            ],
                          ),
                          AppSpacing.verticalSpacerXS,
                          Text(
                            AppLocalizations.of(
                              context,
                            )!.appPasswordDescription,
                            style: context.appTextStyles.caption,
                          ),
                          AppSpacing.verticalSpacerSM,
                          InkWell(
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(_selectedServer.appPasswordUrl),
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
                              AppLocalizations.of(context)!.generateAppPassword,
                              style: context.appTextStyles.caption.copyWith(
                                color: context.appColors.info,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Add account button
                    CommonButtonFactories.primary(
                      onPressed: _addAccount,
                      isLoading: _isLoading,
                      width: double.infinity,
                      size: CommonButtonSize.large,
                      child: Text(
                        AppLocalizations.of(context)!.addAccountButton,
                      ),
                    ),

                    // Error display
                    if (authState is AuthError) ...[
                      AppSpacing.verticalSpacerMD,
                      ErrorWidgets.card(
                        title: AppLocalizations.of(context)!.accountAddError,
                        message: authState.message,
                        margin: EdgeInsets.zero,
                      ),
                    ],

                    const SizedBox(height: 32),

                    // Help text
                    Text(
                      AppLocalizations.of(context)!.multiAccountHelpText,
                      style: context.appTextStyles.caption,
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
