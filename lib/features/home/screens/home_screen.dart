// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/home/widgets/account_switcher.dart';
import 'package:moodesky/features/home/widgets/deck_layout.dart';
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
    final activeAccount = ref.watch(activeAccountProvider);
    
    if (authState is! AuthAuthenticated) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
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
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
              ),
              child: Column(
                children: [
                  // Account switcher
                  const AccountSwitcher(),
                  
                  // Navigation
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(8),
                      children: [
                        _buildNavItem(
                          context,
                          icon: Icons.home,
                          label: 'Home',
                          isSelected: true,
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.notifications,
                          label: 'Notifications',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.search,
                          label: 'Search',
                        ),
                        _buildNavItem(
                          context,
                          icon: Icons.person,
                          label: 'Profile',
                        ),
                        const Divider(),
                        _buildNavItem(
                          context,
                          icon: Icons.settings,
                          label: 'Settings',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          // Main content area - Deck layout
          Expanded(
            child: Column(
              children: [
                // Top app bar (for mobile/tablet)
                if (MediaQuery.of(context).size.width < 1200)
                  AppBar(
                    title: const Text('MoodeSky'),
                    actions: [
                      // Account switcher button
                      IconButton(
                        icon: CircleAvatar(
                          radius: 16,
                          backgroundImage: activeAccount?.avatar != null
                              ? NetworkImage(activeAccount!.avatar!)
                              : null,
                          child: activeAccount?.avatar == null
                              ? Text(
                                  activeAccount?.displayName?.substring(0, 1).toUpperCase() ??
                                  activeAccount?.handle.substring(0, 1).toUpperCase() ??
                                  '?',
                                )
                              : null,
                        ),
                        onPressed: () {
                          _showAccountSwitcher(context);
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: () {
                          // TODO: Show compose dialog
                        },
                      ),
                    ],
                  ),
                
                // Deck layout
                const Expanded(
                  child: DeckLayout(),
                ),
              ],
            ),
          ),
        ],
      ),
      
      // Bottom navigation (mobile only)
      bottomNavigationBar: MediaQuery.of(context).size.width < 600
          ? NavigationBar(
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.notifications),
                  label: 'Notifications',
                ),
                NavigationDestination(
                  icon: Icon(Icons.search),
                  label: 'Search',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person),
                  label: 'Profile',
                ),
              ],
            )
          : null,
      
      // Floating action button (mobile)
      floatingActionButton: MediaQuery.of(context).size.width < 600
          ? FloatingActionButton(
              onPressed: () {
                // TODO: Show compose dialog
              },
              child: const Icon(Icons.edit),
            )
          : null,
    );
  }

  Widget _buildNavItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    bool isSelected = false,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      selected: isSelected,
      onTap: () {
        // TODO: Handle navigation
      },
    );
  }

  void _showAccountSwitcher(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => const AccountSwitcher(),
    );
  }
}
