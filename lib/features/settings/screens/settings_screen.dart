// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/widgets/language_selector.dart';
import 'package:moodesky/shared/widgets/theme_selector.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context)!.settingsTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Appearance Settings Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppLocalizations.of(context)!.appearanceSettings,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Theme Selection
                  const ThemeSelector(),
                  
                  const SizedBox(height: 24),
                  
                  // Language Selection
                  const LanguageSelector(),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Account Settings Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppLocalizations.of(context)!.accountSettings,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  ListTile(
                    leading: const Icon(Icons.manage_accounts),
                    title: Text(AppLocalizations.of(context)!.manageAccounts),
                    subtitle: Text(
                      AppLocalizations.of(context)!.manageAccountsDescription,
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Navigate to account management screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            AppLocalizations.of(context)!.comingSoon,
                          ),
                        ),
                      );
                    },
                  ),

                  const Divider(),

                  ListTile(
                    leading: Icon(
                      Icons.logout,
                      color: Theme.of(context).colorScheme.error,
                    ),
                    title: Text(
                      AppLocalizations.of(context)!.signOutAll,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                    subtitle: Text(
                      AppLocalizations.of(context)!.signOutAllDescription,
                    ),
                    onTap: () => _showSignOutConfirmation(context, ref),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // App Information Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppLocalizations.of(context)!.appInformation,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),

                  ListTile(
                    leading: const Icon(Icons.info),
                    title: Text(AppLocalizations.of(context)!.aboutApp),
                    subtitle: Text(
                      AppLocalizations.of(context)!.appVersion('1.0.0'),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      _showAboutDialog(context);
                    },
                  ),

                  const Divider(),

                  ListTile(
                    leading: const Icon(Icons.privacy_tip),
                    title: Text(AppLocalizations.of(context)!.privacyPolicy),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () {
                      // TODO: Open privacy policy
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            AppLocalizations.of(context)!.comingSoon,
                          ),
                        ),
                      );
                    },
                  ),

                  ListTile(
                    leading: const Icon(Icons.description),
                    title: Text(AppLocalizations.of(context)!.termsOfService),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () {
                      // TODO: Open terms of service
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            AppLocalizations.of(context)!.comingSoon,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showSignOutConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context)!.signOutAllConfirmTitle),
        content: Text(AppLocalizations.of(context)!.signOutAllConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(AppLocalizations.of(context)!.cancelButton),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await ref.read(authNotifierProvider.notifier).signOutAll();
            },
            child: Text(AppLocalizations.of(context)!.signOutButton),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'MoodeSky',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(
          Icons.cloud,
          size: 32,
          color: Theme.of(context).colorScheme.onPrimary,
        ),
      ),
      children: [Text(AppLocalizations.of(context)!.aboutAppDescription)],
    );
  }
}
