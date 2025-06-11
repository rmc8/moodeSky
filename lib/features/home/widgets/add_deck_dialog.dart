// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/core/providers/deck_provider.dart';
import 'package:moodesky/l10n/app_localizations.dart';

class AddDeckDialog extends ConsumerStatefulWidget {
  const AddDeckDialog({super.key});

  @override
  ConsumerState<AddDeckDialog> createState() => _AddDeckDialogState();
}

class _AddDeckDialogState extends ConsumerState<AddDeckDialog> {
  final _titleController = TextEditingController();
  String _selectedDeckType = 'home';
  String? _selectedAccountDid;
  bool _isCrossAccount = false;

  List<(String, String, IconData)> _getDeckTypes(BuildContext context) => [
    ('home', AppLocalizations.of(context).deckTypeHome, Icons.home),
    ('notifications', AppLocalizations.of(context).deckTypeNotifications, Icons.notifications),
    ('search', AppLocalizations.of(context).deckTypeSearch, Icons.search),
    ('list', AppLocalizations.of(context).deckTypeList, Icons.list),
    ('profile', AppLocalizations.of(context).deckTypeProfile, Icons.person),
    ('thread', AppLocalizations.of(context).deckTypeThread, Icons.forum),
    ('custom_feed', AppLocalizations.of(context).deckTypeCustomFeed, Icons.rss_feed),
    ('local', AppLocalizations.of(context).deckTypeLocal, Icons.people),
    ('hashtag', AppLocalizations.of(context).deckTypeHashtag, Icons.tag),
    ('mentions', AppLocalizations.of(context).deckTypeMentions, Icons.alternate_email),
  ];

  @override
  void initState() {
    super.initState();
    // フォーム表示時に必要に応じてプロフィール情報を取得
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshProfilesIfNeeded();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }
  
  // 必要に応じてプロフィール情報を更新
  Future<void> _refreshProfilesIfNeeded() async {
    try {
      await ref.read(authNotifierProvider.notifier).refreshProfilesIfNeeded();
    } catch (e) {
      // エラーは無視（UIブロックを避ける）
      debugPrint('Failed to refresh profiles in AddDeckDialog: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final accounts = ref.watch(availableAccountsProvider);
    
    // フォーム表示時にプロフィール情報を確認・取得
    ref.listen(availableAccountsProvider, (previous, next) {
      // アカウントリストが変更された際に必要に応じてプロフィール情報を更新
      _refreshProfilesIfNeeded();
    });

    return AlertDialog(
      title: Text(AppLocalizations.of(context).addDeckDialogTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // デッキタイトル
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: AppLocalizations.of(context).deckNameLabel,
                hintText: AppLocalizations.of(context).deckNameHint,
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            // デッキタイプ選択
            Text(
              AppLocalizations.of(context).deckTypeLabel,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _getDeckTypes(context).map((type) {
                final isSelected = _selectedDeckType == type.$1;
                return FilterChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(type.$3, size: 16),
                      const SizedBox(width: 4),
                      Text(type.$2),
                    ],
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedDeckType = type.$1;
                        // デッキタイプによってデフォルトのタイトルを設定
                        if (_titleController.text.isEmpty) {
                          _titleController.text = type.$2;
                        }
                      });
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // アカウント選択
            Text(
              AppLocalizations.of(context).accountLabel,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            
            // クロスアカウントオプション
            CheckboxListTile(
              title: Text(AppLocalizations.of(context).useAllAccounts),
              value: _isCrossAccount,
              onChanged: (value) {
                setState(() {
                  _isCrossAccount = value ?? false;
                  if (_isCrossAccount) {
                    _selectedAccountDid = null;
                  }
                });
              },
              contentPadding: EdgeInsets.zero,
            ),

            if (!_isCrossAccount) ...[
              if (accounts.isEmpty)
                Text(AppLocalizations.of(context).noLoggedInAccounts)
              else
                ...accounts.map((account) {
                  return RadioListTile<String>(
                    title: Text('@${account.handle}'),
                    subtitle: account.displayName != null
                        ? Text(account.displayName!)
                        : null,
                    value: account.did,
                    groupValue: _selectedAccountDid,
                    onChanged: (value) {
                      setState(() {
                        _selectedAccountDid = value;
                      });
                    },
                    secondary: account.avatar != null
                        ? CircleAvatar(
                            backgroundImage: NetworkImage(account.avatar!),
                          )
                        : CircleAvatar(
                            child: Text(
                              account.handle.substring(0, 1).toUpperCase(),
                            ),
                          ),
                    contentPadding: EdgeInsets.zero,
                  );
                }),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(AppLocalizations.of(context).cancelButton),
        ),
        FilledButton(
          onPressed: _canCreate() ? _createDeck : null,
          child: Text(AppLocalizations.of(context).addButton),
        ),
      ],
    );
  }

  bool _canCreate() {
    return _titleController.text.isNotEmpty &&
        (_isCrossAccount || _selectedAccountDid != null);
  }

  Future<void> _createDeck() async {
    if (!_canCreate()) return;

    try {
      final deckCreator = ref.read(deckCreatorProvider.notifier);
      
      // デッキ作成前に関連アカウントのプロフィール情報を確実に取得
      if (!_isCrossAccount && _selectedAccountDid != null) {
        await ref.read(authNotifierProvider.notifier).refreshProfilesIfNeeded();
      }
      
      await deckCreator.createDeck(
        title: _titleController.text,
        deckType: _selectedDeckType,
        accountDid: _isCrossAccount ? '' : _selectedAccountDid!,
      );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context).deckAddedSuccess(_titleController.text)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context).deckAddFailed(e.toString())),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }
}