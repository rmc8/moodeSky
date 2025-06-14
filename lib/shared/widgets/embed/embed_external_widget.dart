import 'package:flutter/material.dart';
import 'package:bluesky/bluesky.dart' as bsky;

/// 外部リンク埋め込みウィジェット
/// 
/// AT Protocolの外部リンク埋め込み（bsky.EmbedExternal）を表示する。
/// リンクのタイトル、説明、サムネイル画像、URIを
/// カード形式で表示し、タップでリンクを開く機能を提供する。
class EmbedExternalWidget extends StatelessWidget {
  /// 表示する外部リンク埋め込みデータ
  final bsky.EmbedExternal external;

  /// カードの角の丸み
  final double borderRadius;

  /// リンクタップ時のコールバック
  final void Function(String uri)? onLinkTap;

  /// サムネイル画像の最大高さ
  final double thumbnailMaxHeight;

  const EmbedExternalWidget({
    super.key,
    required this.external,
    this.borderRadius = 8.0,
    this.onLinkTap,
    this.thumbnailMaxHeight = 200.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final externalData = external.external;

    return GestureDetector(
      onTap: () => onLinkTap?.call(externalData.uri),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.dividerColor.withValues(alpha: 0.3),
            width: 1.0,
          ),
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // サムネイル画像
            if (externalData.thumb != null)
              _buildThumbnail(context, externalData.thumb!),
            
            // リンク情報
            _buildLinkContent(context, externalData),
          ],
        ),
      ),
    );
  }

  /// サムネイル画像ウィジェットを構築
  Widget _buildThumbnail(BuildContext context, bsky.Blob thumbnail) {
    final theme = Theme.of(context);

    // TODO: 実際のBluesky APIからサムネイル画像を取得する実装
    // 現在はモック実装として代替表示を使用
    return Container(
      width: double.infinity,
      height: thumbnailMaxHeight,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.image_outlined,
              size: 48.0,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 8.0),
            Text(
              'サムネイル',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// リンクコンテンツ（タイトル、説明、URI）を構築
  Widget _buildLinkContent(BuildContext context, bsky.External externalData) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // タイトル
          if (externalData.title.isNotEmpty)
            Text(
              externalData.title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          
          // 説明
          if (externalData.description.isNotEmpty) ...[
            const SizedBox(height: 6.0),
            Text(
              externalData.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          
          // URI
          const SizedBox(height: 8.0),
          Row(
            children: [
              Icon(
                Icons.link,
                size: 16.0,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 6.0),
              Expanded(
                child: Text(
                  _formatUri(externalData.uri),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                    decoration: TextDecoration.underline,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// URIを表示用にフォーマット
  String _formatUri(String uri) {
    try {
      final parsedUri = Uri.parse(uri);
      final host = parsedUri.host;
      final path = parsedUri.path;
      
      // ホスト名のみ、または短いパスの場合は表示
      if (path.isEmpty || path == '/') {
        return host;
      }
      
      // パスが長い場合は省略
      if (path.length > 30) {
        return '$host${path.substring(0, 27)}...';
      }
      
      return '$host$path';
    } catch (e) {
      // パースエラーの場合はそのまま返す
      return uri;
    }
  }

  /// デバッグ用：外部リンク情報を取得
  Map<String, String> getLinkInfo() {
    final externalData = external.external;
    return {
      'title': externalData.title,
      'description': externalData.description,
      'uri': externalData.uri,
      'hasThumb': (externalData.thumb != null).toString(),
    };
  }
}