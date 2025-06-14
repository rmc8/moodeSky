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
  /// 画像間の余白サイズ
  static const double _imageSpacing = 4.0;

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
    
    try {
      // 画像リストを抽出
      final imagesList = images.images as List<dynamic>?;
      
      if (imagesList == null || imagesList.isEmpty) {
        debugPrint('❌ No images found in embed');
        return _buildImagesPlaceholder(context);
      }
      
      debugPrint('🖼️ Found ${imagesList.length} images');
      
      // 画像数に応じてレイアウトを選択
      switch (imagesList.length) {
        case 1:
          return _buildSingleImage(context, imagesList[0]);
        case 2:
          return _buildTwoImages(context, imagesList);
        case 3:
          return _buildThreeImages(context, imagesList);
        case 4:
        default:
          return _buildFourImages(context, imagesList.take(4).toList());
      }
    } catch (e) {
      debugPrint('❌ Error building images embed: $e');
      return _buildImagesPlaceholder(context);
    }
  }
  
  /// 1枚画像レイアウト
  Widget _buildSingleImage(BuildContext context, dynamic image) {
    return AspectRatio(
      aspectRatio: 16 / 9, // 全体を16:9に統一
      child: _buildImageWidget(
        context, 
        image,
        aspectRatio: 16 / 9,
        borderRadius: BorderRadius.circular(6.0),
      ),
    );
  }
  
  /// 2枚画像レイアウト（横並び）
  Widget _buildTwoImages(BuildContext context, List<dynamic> images) {
    return AspectRatio(
      aspectRatio: 16 / 9, // 全体を16:9に統一
      child: Row(
        children: [
          Expanded(
            child: _buildImageWidget(
              context,
              images[0],
              aspectRatio: 8 / 9, // 16:9を2分割したアスペクト比
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(6.0),
                bottomLeft: Radius.circular(6.0),
              ),
            ),
          ),
          SizedBox(width: _imageSpacing),
          Expanded(
            child: _buildImageWidget(
              context,
              images[1],
              aspectRatio: 8 / 9,
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(6.0),
                bottomRight: Radius.circular(6.0),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// 3枚画像レイアウト（参考実装ベース）
  Widget _buildThreeImages(BuildContext context, List<dynamic> images) {
    return AspectRatio(
      aspectRatio: 16 / 9, // 全体を16:9に統一
      child: Row(
        children: [
          _buildSingleColumn(context, images[0]), // 左列：1枚
          SizedBox(width: _imageSpacing),
          _buildDoubleColumn(context, images[1], images[2]), // 右列：2枚
        ],
      ),
    );
  }
  
  /// 左列：1枚画像（3枚レイアウト用）
  Widget _buildSingleColumn(BuildContext context, dynamic image) {
    return Expanded(
      child: _buildImageWidget(
        context,
        image,
        aspectRatio: 8 / 9, // 16:9の半分幅
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(6.0),
          bottomLeft: Radius.circular(6.0),
        ),
      ),
    );
  }
  
  /// 右列：2枚画像（3枚レイアウト用）
  Widget _buildDoubleColumn(BuildContext context, dynamic image1, dynamic image2) {
    return Expanded(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final totalHeight = constraints.maxHeight;
          final imageHeight = (totalHeight - _imageSpacing) / 2; // 余白を引いて2で割る
          
          return Column(
            children: [
              SizedBox(
                height: imageHeight,
                child: _buildImageWidget(
                  context,
                  image1,
                  aspectRatio: null, // ピクセル値で高さ指定するためnull
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(6.0),
                  ),
                ),
              ),
              SizedBox(height: _imageSpacing), // 余白はそのまま
              SizedBox(
                height: imageHeight,
                child: _buildImageWidget(
                  context,
                  image2,
                  aspectRatio: null, // ピクセル値で高さ指定するためnull
                  borderRadius: const BorderRadius.only(
                    bottomRight: Radius.circular(6.0),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
  
  /// 4枚画像レイアウト（2x2グリッド）
  Widget _buildFourImages(BuildContext context, List<dynamic> images) {
    return AspectRatio(
      aspectRatio: 16 / 9, // 全体を16:9に統一
      child: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildImageWidget(
                    context,
                    images[0],
                    aspectRatio: 8 / 4.5, // 半分幅、半分高さ
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(6.0),
                    ),
                  ),
                ),
                SizedBox(width: _imageSpacing),
                Expanded(
                  child: _buildImageWidget(
                    context,
                    images[1],
                    aspectRatio: 8 / 4.5,
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(6.0),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: _imageSpacing),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildImageWidget(
                    context,
                    images[2],
                    aspectRatio: 8 / 4.5,
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(6.0),
                    ),
                  ),
                ),
                SizedBox(width: _imageSpacing),
                Expanded(
                  child: _buildImageWidget(
                    context,
                    images[3],
                    aspectRatio: 8 / 4.5,
                    borderRadius: const BorderRadius.only(
                      bottomRight: Radius.circular(6.0),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  /// 共通画像ウィジェット
  Widget _buildImageWidget(
    BuildContext context,
    dynamic imageData, {
    required double? aspectRatio, // nullableに変更
    required BorderRadius borderRadius,
  }) {
    try {
      // 画像URLを抽出
      final thumbnailUrl = imageData.thumbnail as String?;
      
      if (thumbnailUrl == null || thumbnailUrl.isEmpty) {
        return _buildImagePlaceholder(context, aspectRatio, borderRadius);
      }
      
      return GestureDetector(
        onTap: () {
          // TODO: フルサイズ画像表示
          final fullsizeUrl = imageData.fullsize as String?;
          debugPrint('🖼️ Image tapped: thumbnail=$thumbnailUrl, fullsize=$fullsizeUrl');
        },
        child: aspectRatio != null 
          ? AspectRatio(
              aspectRatio: aspectRatio,
              child: _buildImageContainer(context, thumbnailUrl, borderRadius),
            )
          : _buildImageContainer(context, thumbnailUrl, borderRadius),
      );
    } catch (e) {
      debugPrint('❌ Error building image widget: $e');
      return _buildImagePlaceholder(context, aspectRatio, borderRadius);
    }
  }
  
  /// 画像コンテナ（AspectRatio有無に関わらず共通）
  Widget _buildImageContainer(BuildContext context, String thumbnailUrl, BorderRadius borderRadius) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.6),
          width: 0.5,
        ),
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Image.network(
          thumbnailUrl,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              width: double.infinity,
              height: double.infinity,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: borderRadius,
              ),
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
            debugPrint('❌ Image load error: $error');
            return _buildImageError(context, null, borderRadius);
          },
        ),
      ),
    );
  }
  
  /// 画像プレースホルダー
  Widget _buildImagePlaceholder(BuildContext context, double? aspectRatio, BorderRadius borderRadius) {
    final theme = Theme.of(context);
    final content = Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: borderRadius,
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.6),
          width: 0.5,
        ),
      ),
      child: Center(
        child: Icon(
          Icons.image_outlined,
          color: theme.colorScheme.onSurfaceVariant,
          size: 32.0,
        ),
      ),
    );
    
    return aspectRatio != null 
      ? AspectRatio(aspectRatio: aspectRatio, child: content)
      : content;
  }
  
  /// 画像エラー表示
  Widget _buildImageError(BuildContext context, double? aspectRatio, BorderRadius borderRadius) {
    final theme = Theme.of(context);
    final content = Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: borderRadius,
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.6),
          width: 0.5,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.broken_image,
              color: theme.colorScheme.onSurfaceVariant,
              size: 32.0,
            ),
            SizedBox(height: _imageSpacing),
            Text(
              '画像読み込み失敗',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
    
    return aspectRatio != null 
      ? AspectRatio(aspectRatio: aspectRatio, child: content)
      : content;
  }
  
  /// 画像埋め込みプレースホルダー（画像なしの場合）
  Widget _buildImagesPlaceholder(BuildContext context) {
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
              '画像が見つかりません',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
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
    debugPrint('💬 Record object structure: ${record.toString()}');
    
    try {
      // レコードデータを抽出
      final recordData = _extractRecordData(record);
      
      if (recordData == null) {
        return _buildRecordError(context, 'レコードデータが見つかりません');
      }
      
      return GestureDetector(
        onTap: () {
          debugPrint('💬 Record tapped');
          // TODO: 引用投稿の詳細表示
        },
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
              width: 1.0,
            ),
            borderRadius: BorderRadius.circular(8.0),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildRecordHeader(context, recordData),
                const SizedBox(height: 8.0),
                _buildRecordContent(context, recordData),
                if (_hasRecordImages(recordData)) ...[
                  const SizedBox(height: 8.0),
                  _buildRecordImages(context, recordData),
                ],
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      debugPrint('❌ Error building record embed: $e');
      return _buildRecordError(context, 'レコードの読み込みに失敗しました');
    }
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

  /// レコードデータを抽出
  Map<String, dynamic>? _extractRecordData(dynamic record) {
    try {
      // レコード構造の解析
      final recordObj = record.record;
      if (recordObj == null) return null;
      
      // 投稿者情報を抽出
      final author = recordObj.author;
      final authorName = author?.displayName ?? author?.handle ?? 'Unknown User';
      final authorHandle = author?.handle ?? '';
      final authorAvatar = author?.avatar;
      
      // 投稿内容を抽出
      final value = recordObj.value;
      final text = value?.text ?? '';
      
      // 埋め込み画像を抽出
      final embeds = value?.embed;
      
      debugPrint('💬 Extracted record data:');
      debugPrint('  Author: $authorName (@$authorHandle)');
      debugPrint('  Text: ${text.length > 50 ? text.substring(0, 50) + '...' : text}');
      debugPrint('  Has embeds: ${embeds != null}');
      
      return {
        'authorName': authorName,
        'authorHandle': authorHandle,
        'authorAvatar': authorAvatar,
        'text': text,
        'embeds': embeds,
      };
    } catch (e) {
      debugPrint('❌ Error extracting record data: $e');
      return null;
    }
  }
  
  /// レコードヘッダー（投稿者情報）を構築
  Widget _buildRecordHeader(BuildContext context, Map<String, dynamic> recordData) {
    final theme = Theme.of(context);
    final authorName = recordData['authorName'] as String;
    final authorHandle = recordData['authorHandle'] as String;
    final authorAvatar = recordData['authorAvatar'] as String?;
    
    return Row(
      children: [
        // アバター
        CircleAvatar(
          radius: 16.0,
          backgroundImage: authorAvatar != null && authorAvatar.isNotEmpty
              ? NetworkImage(authorAvatar)
              : null,
          child: authorAvatar == null || authorAvatar.isEmpty
              ? Text(
                  authorName.isNotEmpty ? authorName[0].toUpperCase() : '?',
                  style: const TextStyle(
                    fontSize: 14.0,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        
        const SizedBox(width: 8.0),
        
        // 名前とハンドル
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                authorName,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (authorHandle.isNotEmpty)
                Text(
                  '@$authorHandle',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
        
        // 引用アイコン
        Icon(
          Icons.format_quote,
          size: 16.0,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ],
    );
  }
  
  /// レコードコンテンツ（投稿テキスト）を構築
  Widget _buildRecordContent(BuildContext context, Map<String, dynamic> recordData) {
    final theme = Theme.of(context);
    final text = recordData['text'] as String;
    
    if (text.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Text(
      text,
      style: theme.textTheme.bodyMedium,
      maxLines: 3,
      overflow: TextOverflow.ellipsis,
    );
  }
  
  /// レコードに画像があるかチェック
  bool _hasRecordImages(Map<String, dynamic> recordData) {
    final embeds = recordData['embeds'];
    if (embeds == null) return false;
    
    try {
      // 埋め込み内容をチェック（簡易実装）
      final embedString = embeds.toString();
      return embedString.contains('images') || embedString.contains('image');
    } catch (e) {
      return false;
    }
  }
  
  /// レコード画像を構築
  Widget _buildRecordImages(BuildContext context, Map<String, dynamic> recordData) {
    final theme = Theme.of(context);
    
    // 簡易実装：画像プレースホルダー
    return Container(
      height: 100.0,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6.0),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.6),
          width: 0.5,
        ),
      ),
      child: Center(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.image_outlined,
              color: theme.colorScheme.onSurfaceVariant,
              size: 20.0,
            ),
            const SizedBox(width: 8.0),
            Text(
              '画像',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  /// レコードエラー表示を構築
  Widget _buildRecordError(BuildContext context, String message) {
    final theme = Theme.of(context);
    
    return Container(
      padding: const EdgeInsets.all(12.0),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.3),
          width: 1.0,
        ),
        borderRadius: BorderRadius.circular(8.0),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: theme.colorScheme.onSurfaceVariant,
            size: 20.0,
          ),
          const SizedBox(width: 8.0),
          Expanded(
            child: Text(
              message,
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