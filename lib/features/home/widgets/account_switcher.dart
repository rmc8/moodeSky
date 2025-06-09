// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class AccountSwitcher extends ConsumerWidget {
  const AccountSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeAccount = ref.watch(activeAccountProvider);
    final availableAccounts = ref.watch(availableAccountsProvider);

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Text(
                'Switch Account',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Current account
          if (activeAccount != null)
            _buildAccountTile(
              context,
              ref,
              activeAccount,
              isActive: true,
            ),
          
          // Other accounts
          if (availableAccounts.length > 1) ...[
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 8),
            ...availableAccounts
                .where((account) => account.did != activeAccount?.did)
                .map((account) => _buildAccountTile(context, ref, account)),
          ],
          
          const SizedBox(height: 16),
          
          // Add account button
          ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.add,
                color: Theme.of(context).colorScheme.onSecondaryContainer,
              ),
            ),
            title: const Text('Add Account'),
            onTap: () {
              Navigator.of(context).pop();
              // TODO: Navigate to add account
            },
          ),
          
          // Sign out all button
          if (availableAccounts.isNotEmpty) ...[
            const SizedBox(height: 8),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.errorContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.logout,
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
              ),
              title: const Text('Sign Out All'),
              onTap: () {
                _showSignOutConfirmation(context, ref);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAccountTile(
    BuildContext context,
    WidgetRef ref,
    UserProfile account, {
    bool isActive = false,
  }) {
    return ListTile(
      leading: CircleAvatar(
        radius: 20,
        backgroundImage: account.avatar != null
            ? NetworkImage(account.avatar!)
            : null,
        child: account.avatar == null
            ? Text(
                account.displayName?.substring(0, 1).toUpperCase() ??
                account.handle.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              )
            : null,
      ),
      title: Text(
        account.displayName ?? account.handle,
        style: TextStyle(
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      subtitle: Text('@${account.handle}'),
      trailing: isActive
          ? Icon(
              Icons.check_circle,
              color: Theme.of(context).colorScheme.primary,
            )
          : null,
      onTap: isActive
          ? null
          : () async {
              Navigator.of(context).pop();
              await ref
                  .read(authNotifierProvider.notifier)
                  .switchAccount(account.did);
            },
    );
  }

  void _showSignOutConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out All Accounts'),
        content: const Text(
          'Are you sure you want to sign out of all accounts? You will need to sign in again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Close account switcher
              await ref.read(authNotifierProvider.notifier).signOutAll();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
