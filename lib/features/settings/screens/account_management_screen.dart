// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/shared/models/auth_models.dart';
import 'package:moodesky/shared/widgets/common/index.dart';

/// アカウント管理画面
/// 
/// 複数アカウントの管理、切り替え、追加、削除機能を提供します。
class AccountManagementScreen extends ConsumerWidget {
  const AccountManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final accounts = ref.watch(availableAccountsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('アカウント管理'),
        elevation: 0,
      ),
      body: _buildAccountList(context, ref, accounts),
    );
  }

  Widget _buildAccountList(
    BuildContext context,
    WidgetRef ref,
    List<UserProfile> accounts,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: accounts.length + 1, // +1 for add account button
      itemBuilder: (context, index) {
        if (index == accounts.length) {
          return _buildAddAccountButton(context);
        }
        
        final account = accounts[index];
        return _buildAccountItem(context, ref, account);
      },
    );
  }

  Widget _buildAccountItem(
    BuildContext context,
    WidgetRef ref,
    UserProfile account,
  ) {
    final displayName = account.displayName ?? account.handle ?? 'Unknown';
    final handle = account.handle ?? '';
    final isActive = false; // TODO: アクティブアカウントの判定ロジックを実装
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: account.avatar != null 
            ? NetworkImage(account.avatar!)
            : null,
          child: account.avatar == null 
            ? Text(displayName.isNotEmpty ? displayName[0].toUpperCase() : '?')
            : null,
        ),
        title: Text(displayName),
        subtitle: Text('@$handle'),
        trailing: isActive 
          ? const Icon(Icons.check_circle, color: Colors.green)
          : IconButton(
              icon: const Icon(Icons.more_vert),
              onPressed: () => _showAccountOptions(context, ref, account),
            ),
        onTap: isActive ? null : () => _switchAccount(ref, account),
      ),
    );
  }

  Widget _buildAddAccountButton(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const CircleAvatar(
          child: Icon(Icons.add),
        ),
        title: const Text('新しいアカウントを追加'),
        subtitle: const Text('別のBlueskyアカウントでログイン'),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: () => _addAccount(context),
      ),
    );
  }

  void _switchAccount(WidgetRef ref, UserProfile account) {
    // TODO: 実際のアカウント切り替え処理
    ref.read(authNotifierProvider.notifier).switchAccount(account.did);
  }

  void _addAccount(BuildContext context) {
    // 新しいアカウント追加画面に遷移
    Navigator.of(context).pushNamed('/add-account');
  }

  void _showAccountOptions(BuildContext context, WidgetRef ref, UserProfile account) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _buildAccountOptionsSheet(context, ref, account),
    );
  }

  Widget _buildAccountOptionsSheet(
    BuildContext context,
    WidgetRef ref,
    UserProfile account,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.switch_account),
            title: const Text('このアカウントに切り替え'),
            onTap: () {
              Navigator.pop(context);
              _switchAccount(ref, account);
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete, color: Colors.red),
            title: const Text('アカウントを削除', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              _confirmDeleteAccount(context, ref, account);
            },
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount(
    BuildContext context,
    WidgetRef ref,
    UserProfile account,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('アカウント削除の確認'),
        content: Text('${account.displayName ?? account.handle}を削除しますか？\n\nこの操作は元に戻せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              _deleteAccount(ref, account);
            },
            child: const Text('削除'),
          ),
        ],
      ),
    );
  }

  void _deleteAccount(WidgetRef ref, UserProfile account) {
    // TODO: 実際のアカウント削除処理
    ref.read(authNotifierProvider.notifier).removeAccount(account.did);
  }
}