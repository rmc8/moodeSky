// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/core/providers/theme_provider.dart';
import 'package:moodesky/core/theme/app_themes.dart';
import 'package:moodesky/features/home/widgets/add_deck_dialog.dart';
import 'package:moodesky/features/home/widgets/deck_layout.dart';
import 'package:moodesky/features/settings/screens/settings_screen.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    
    // テーマ変更を監視して確実に更新されるようにする
    final currentTheme = ref.watch(currentThemeModeProvider);

    if (authState is! AuthAuthenticated) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AppThemes.getSystemUiOverlayStyle(context),
      child: Scaffold(
        body: Row(
        children: [
          // Sidebar (for desktop/tablet)
          if (MediaQuery.of(context).size.width >= 1200) ...[
            Container(
              width: 300,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainer,
                border: Border(
                  right: BorderSide(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
              ),
              child: Column(
                children: [
                  // Logged-in accounts header
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLocalizations.of(context).appTitle,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildLoggedInAccounts(),
                      ],
                    ),
                  ),
                  const Divider(),

                  // Navigation
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(8),
                      children: [
                        _buildNavItem(
                          context,
                          icon: Icons.home,
                          label: AppLocalizations.of(context).homeNavigation,
                          isSelected: true,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.notifications,
                          label: AppLocalizations.of(context).notificationsNavigation,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.search,
                          label: AppLocalizations.of(context).searchNavigation,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.person,
                          label: AppLocalizations.of(context).profileNavigation,
                        ),
                        const Divider(),
                        _buildNavItem(
                          context,
                          icon: Icons.add_box,
                          label: AppLocalizations.of(context).addDeckButton,
                          onTap: () => _showAddDeckDialog(context),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Main content area - Deck layout (no AppBar)
          Expanded(
            child: SafeArea(
              child: DeckLayout(
                key: ValueKey('deck_layout_${currentTheme?.index ?? 0}'),
              ),
            ),
          ),
        ],
      ),

      // Bottom navigation (all devices except desktop)
        bottomNavigationBar: MediaQuery.of(context).size.width < 1200
            ? _buildBottomNavigationBar()
            : null,
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    bool isSelected = false,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      selected: isSelected,
      onTap:
          onTap ??
          () {
            // TODO: Handle navigation
          },
    );
  }

  void _navigateToSettings(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (context) => const SettingsScreen()));
  }

  void _showAddDeckDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const AddDeckDialog(),
    );
  }

  void _showComposeDialog(BuildContext context) {
    // TODO: Implement compose dialog
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context).composeFunctionUnderDev)),
    );
  }

  Widget _buildBottomNavigationBar() {
    final screenWidth = MediaQuery.of(context).size.width;
    
    if (screenWidth >= 600) {
      // Tablet: Extended navigation bar with more options
      return NavigationBar(
        selectedIndex: 0, // Home is always selected for now
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.home),
            label: AppLocalizations.of(context).homeNavigation,
          ),
          NavigationDestination(
            icon: const Icon(Icons.add_box),
            label: AppLocalizations.of(context).addDeckButton,
            tooltip: AppLocalizations.of(context).addDeckTooltip,
          ),
          NavigationDestination(
            icon: const Icon(Icons.edit),
            label: AppLocalizations.of(context).composeNavigation,
            tooltip: AppLocalizations.of(context).composeTooltip,
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications),
            label: AppLocalizations.of(context).notificationsNavigation,
          ),
          NavigationDestination(
            icon: Icon(Icons.search),
            label: AppLocalizations.of(context).searchNavigation,
          ),
          NavigationDestination(
            icon: const Icon(Icons.settings),
            label: AppLocalizations.of(context).settingsTitle,
            tooltip: AppLocalizations.of(context).settingsTooltip,
          ),
        ],
        onDestinationSelected: (index) => _handleNavigationTap(index),
      );
    } else {
      // Mobile: Compact navigation bar
      return NavigationBar(
        selectedIndex: 0, // Home is always selected for now
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.home),
            label: AppLocalizations.of(context).homeNavigation,
          ),
          NavigationDestination(
            icon: const Icon(Icons.add_box),
            label: AppLocalizations.of(context).deckNavigation,
            tooltip: AppLocalizations.of(context).addDeckTooltip,
          ),
          NavigationDestination(
            icon: const Icon(Icons.edit),
            label: AppLocalizations.of(context).composeNavigation,
            tooltip: AppLocalizations.of(context).composeTooltip,
          ),
          NavigationDestination(
            icon: const Icon(Icons.settings),
            label: AppLocalizations.of(context).settingsTitle,
            tooltip: AppLocalizations.of(context).settingsTooltip,
          ),
        ],
        onDestinationSelected: (index) => _handleNavigationTap(index),
      );
    }
  }

  void _handleNavigationTap(int index) {
    final screenWidth = MediaQuery.of(context).size.width;
    
    if (screenWidth >= 600) {
      // Tablet navigation handling
      switch (index) {
        case 0: // Home - already here
          break;
        case 1: // Add Deck
          _showAddDeckDialog(context);
          break;
        case 2: // Compose
          _showComposeDialog(context);
          break;
        case 3: // Notifications
          // TODO: Navigate to notifications
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).notificationsFunctionUnderDev)),
          );
          break;
        case 4: // Search
          // TODO: Navigate to search
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).searchFunctionUnderDev)),
          );
          break;
        case 5: // Settings
          _navigateToSettings(context);
          break;
      }
    } else {
      // Mobile navigation handling
      switch (index) {
        case 0: // Home - already here
          break;
        case 1: // Add Deck
          _showAddDeckDialog(context);
          break;
        case 2: // Compose
          _showComposeDialog(context);
          break;
        case 3: // Settings
          _navigateToSettings(context);
          break;
      }
    }
  }

  Widget _buildLoggedInAccounts() {
    final accounts = ref.watch(availableAccountsProvider);
    
    if (accounts.isEmpty) {
      return Text(
        AppLocalizations.of(context).noLoggedInAccounts,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      );
    }
    
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: accounts.map((account) {
        return Chip(
          avatar: account.avatar != null
              ? CircleAvatar(
                  backgroundImage: NetworkImage(account.avatar!),
                )
              : CircleAvatar(
                  child: Text(
                    account.handle.substring(0, 1).toUpperCase(),
                  ),
                ),
          label: Text('@${account.handle}'),
          labelStyle: Theme.of(context).textTheme.bodySmall,
        );
      }).toList(),
    );
  }
}
