// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;

// Project imports:
import 'package:moodesky/shared/utils/url_utils.dart';

/// 現在のBluesky 0.18.10 EmbedView用のウィジェット
/// 
/// AT ProtocolのEmbedViewデータ（bsky.EmbedView）を受け取り、
/// 適切な表示ウィジェットに振り分けて表示する。
/// 
/// サポートするEmbedViewタイプ：
/// - 画像（images）
/// - 動画（video）
/// - 外部リンク（external）
/// - 投稿引用（record）
/// - メディア付き投稿引用（recordWithMedia）
class EmbedViewWidget extends StatelessWidget {
  /// 表示するEmbedViewデータ
  final bsky.EmbedView embedView;

  /// ウィジェット間のパディング
  final EdgeInsetsGeometry? padding;

  /// ウィジェットの角の丸み
  final BorderRadius? borderRadius;

  /// 背景色
  final Color? backgroundColor;

  /// 最大高さ制限
  final double? maxHeight;

  const EmbedViewWidget({
    super.key,
    required this.embedView,
    this.padding,
    this.borderRadius,
    this.backgroundColor,
    this.maxHeight,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // デフォルト値の設定
    final effectivePadding = padding ?? EdgeInsets.zero; // 余白なしに変更
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(8.0);
    final effectiveBackgroundColor = backgroundColor ?? Colors.transparent; // 透明背景に変更

    return Container(
      padding: effectivePadding,
      decoration: effectiveBackgroundColor != Colors.transparent 
        ? BoxDecoration(
            color: effectiveBackgroundColor,
            borderRadius: effectiveBorderRadius,
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.3),
              width: 1.0,
            ),
          )
        : null, // 透明な場合は装飾なし
      constraints: maxHeight != null ? BoxConstraints(maxHeight: maxHeight!) : null,
      child: _buildEmbedViewContent(context),
    );
  }

  /// EmbedViewタイプに応じた適切なウィジェットを構築
  Widget _buildEmbedViewContent(BuildContext context) {
    return embedView.when(
      // 画像埋め込み
      images: (images) => _buildImagesEmbed(context, images),
      
      // 動画埋め込み
      video: (video) => _buildVideoEmbed(context, video),
      
      // 外部リンク埋め込み
      external: (external) => _buildExternalEmbed(context, external),
      
      // 投稿引用埋め込み
      record: (record) => _buildRecordEmbed(context, record),
      
      // メディア付き投稿引用埋め込み
      recordWithMedia: (recordWithMedia) => _buildRecordWithMediaEmbed(context, recordWithMedia),
      
      // 未知の埋め込みタイプまたはエラー処理
      unknown: (data) => _buildUnknownEmbed(context, data),
    );
  }

  /// 画像埋め込みウィジェット
  Widget _buildImagesEmbed(BuildContext context, dynamic images) {
    debugPrint('🖼️ Building images embed: ${images.runtimeType}');
    debugPrint('🖼️ Images object structure: ${images.toString()}');
    
    // 詳細な構造調査
    _debugImagesStructure(images);
    
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.image,
            color: Theme.of(context).colorScheme.primary,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              '画像 (${images.runtimeType})',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// 画像オブジェクトの構造を詳細調査
  void _debugImagesStructure(dynamic images) {
    debugPrint('🔍 Images embed detailed analysis:');
    debugPrint('  Runtime type: ${images.runtimeType}');
    
    // 一般的なプロパティの存在をチェック
    final commonProps = ['images', 'image', 'data', 'items', 'list'];
    for (final prop in commonProps) {
      try {
        final objString = images.toString();
        if (objString.contains(prop)) {
          debugPrint('  Contains "$prop" in structure');
        }
      } catch (e) {
        // エラーは無視
      }
    }
  }

  /// 動画埋め込みウィジェット
  Widget _buildVideoEmbed(BuildContext context, dynamic video) {
    debugPrint('🎥 Building video embed: ${video.runtimeType}');
    
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.videocam,
            color: Theme.of(context).colorScheme.primary,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              '動画 (${video.runtimeType})',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 外部リンク埋め込みウィジェット
  Widget _buildExternalEmbed(BuildContext context, dynamic external) {
    debugPrint('🔗 Building external embed: ${external.runtimeType}');
    debugPrint('🔗 External object structure: ${external.toString()}');
    
    // 詳細な構造調査
    _debugExternalStructure(external);
    
    try {
      // 直接新しいAPIデータを使用してカスタム外部リンクカードを構築
      return _buildModernExternalLinkCard(context, external);
    } catch (e) {
      debugPrint('❌ Error building external embed: $e');
      // フォールバック表示
      return _buildExternalFallback(context, external);
    }
  }
  
  /// 現在のAPI用のモダンな外部リンクカードを構築
  Widget _buildModernExternalLinkCard(BuildContext context, dynamic external) {
    final theme = Theme.of(context);
    
    try {
      // 新しいAPIからデータを抽出
      final externalData = external.external;
      final uri = externalData?.uri as String?;
      final title = externalData?.title as String?;
      final description = externalData?.description as String?;
      final thumbnailUrl = externalData?.thumbnail as String?; // URL文字列
      
      debugPrint('🔗 Modern card - URI: $uri, Title: $title, Thumbnail: $thumbnailUrl');
      
      if (uri == null) {
        return _buildExternalFallback(context, external);
      }
      
      return GestureDetector(
        onTap: () async {
          debugPrint('🔗 External link tapped: $uri');
          try {
            final success = await UrlUtils.launchExternalUrl(uri);
            if (!success) {
              debugPrint('❌ Failed to launch URL: $uri');
            }
          } catch (e) {
            debugPrint('❌ Error launching URL: $e');
          }
        },
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: theme.colorScheme.outline.withValues(alpha: 0.3),
              width: 1.0,
            ),
            borderRadius: BorderRadius.circular(8.0),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // サムネイル画像
              if (thumbnailUrl != null && thumbnailUrl.isNotEmpty)
                _buildNetworkThumbnail(context, thumbnailUrl),
              
              // リンク情報
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // タイトル
                    if (title != null && title.isNotEmpty)
                      Text(
                        title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    
                    // 説明文
                    if (description != null && description.isNotEmpty) ...[ 
                      const SizedBox(height: 6.0),
                      Text(
                        description,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    
                    // URL
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
                            _formatUri(uri),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.primary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      debugPrint('❌ Error building modern external card: $e');
      return _buildExternalFallback(context, external);
    }
  }
  
  /// ネットワーク画像サムネイルを構築
  Widget _buildNetworkThumbnail(BuildContext context, String thumbnailUrl) {
    final theme = Theme.of(context);
    
    return SizedBox(
      width: double.infinity,
      height: 200,
      child: Image.network(
        thumbnailUrl,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            height: 200,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                    : null,
              ),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          debugPrint('❌ Thumbnail load error: $error');
          return Container(
            height: 200,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.broken_image,
                    size: 48.0,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    'サムネイル読み込みエラー',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
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
  
  /// 外部リンクのフォールバック表示
  Widget _buildExternalFallback(BuildContext context, dynamic external) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.link,
            color: Theme.of(context).colorScheme.primary,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              '外部リンク (${external.runtimeType})',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// 外部リンクオブジェクトの構造を詳細調査
  void _debugExternalStructure(dynamic external) {
    debugPrint('🔍 External embed detailed analysis:');
    debugPrint('  Runtime type: ${external.runtimeType}');
    
    // 一般的なプロパティの存在をチェック
    final commonProps = ['uri', 'title', 'description', 'thumb', 'external'];
    for (final prop in commonProps) {
      try {
        final objString = external.toString();
        if (objString.contains(prop)) {
          debugPrint('  Contains "$prop" in structure');
        }
      } catch (e) {
        // エラーは無視
      }
    }
  }

  /// 投稿引用埋め込みウィジェット
  Widget _buildRecordEmbed(BuildContext context, dynamic record) {
    debugPrint('💬 Building record embed: ${record.runtimeType}');
    
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.format_quote,
            color: Theme.of(context).colorScheme.primary,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              '投稿引用 (${record.runtimeType})',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// メディア付き投稿引用埋め込みウィジェット
  Widget _buildRecordWithMediaEmbed(BuildContext context, dynamic recordWithMedia) {
    debugPrint('🎬 Building record with media embed: ${recordWithMedia.runtimeType}');
    
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.perm_media,
            color: Theme.of(context).colorScheme.primary,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              'メディア付き投稿引用 (${recordWithMedia.runtimeType})',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 未知の埋め込みタイプの場合のフォールバックウィジェット
  Widget _buildUnknownEmbed(BuildContext context, dynamic data) {
    debugPrint('❓ Building unknown embed: ${data.runtimeType}');
    
    final theme = Theme.of(context);
    
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(
            Icons.help_outline,
            color: theme.colorScheme.onSurfaceVariant,
            size: 24.0,
          ),
          const SizedBox(width: 12.0),
          Expanded(
            child: Text(
              '未対応の埋め込みタイプ (${data.runtimeType})',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// デバッグ用：埋め込みタイプを取得
  String getEmbedViewType() {
    return embedView.when(
      images: (_) => 'images',
      video: (_) => 'video',
      external: (_) => 'external',
      record: (_) => 'record',
      recordWithMedia: (_) => 'recordWithMedia',
      unknown: (_) => 'unknown',
    );
  }
}