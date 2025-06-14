import 'package:flutter/material.dart';
import 'package:bluesky/bluesky.dart' as bsky;

/// 画像埋め込みウィジェット
/// 
/// AT Protocolの画像埋め込み（bsky.EmbedImages）を表示する。
/// 複数画像のグリッドレイアウト、画像のタップ拡大表示、
/// 代替テキスト（altテキスト）の表示をサポートする。
class EmbedImagesWidget extends StatelessWidget {
  /// 表示する画像埋め込みデータ
  final bsky.EmbedImages images;

  /// 画像間のスペース
  final double spacing;

  /// 画像の角の丸み
  final double borderRadius;

  /// 最大高さ制限
  final double? maxHeight;

  /// 画像タップ時のコールバック
  final void Function(bsky.EmbedImage image, int index)? onImageTap;

  const EmbedImagesWidget({
    super.key,
    required this.images,
    this.spacing = 4.0,
    this.borderRadius = 8.0,
    this.maxHeight,
    this.onImageTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageList = images.images;
    
    if (imageList.isEmpty) {
      return const SizedBox.shrink();
    }

    // 画像数に応じてレイアウトを決定
    return _buildImageLayout(context, imageList);
  }

  /// 画像数に応じた適切なレイアウトを構築
  Widget _buildImageLayout(BuildContext context, List<bsky.EmbedImage> imageList) {
    final constraints = maxHeight != null 
        ? BoxConstraints(maxHeight: maxHeight!)
        : const BoxConstraints(maxHeight: 400.0);

    if (imageList.length == 1) {
      // 単一画像の場合
      return _buildSingleImage(context, imageList.first, 0, constraints);
    } else if (imageList.length == 2) {
      // 2画像の場合：横並び
      return _buildTwoImages(context, imageList, constraints);
    } else if (imageList.length == 3) {
      // 3画像の場合：1つ大きく + 2つ縦並び
      return _buildThreeImages(context, imageList, constraints);
    } else {
      // 4画像以上の場合：2x2グリッド（最大4枚まで表示）
      return _buildGridImages(context, imageList.take(4).toList(), constraints);
    }
  }

  /// 単一画像レイアウト
  Widget _buildSingleImage(
    BuildContext context, 
    bsky.EmbedImage image, 
    int index,
    BoxConstraints constraints,
  ) {
    return Container(
      constraints: constraints,
      child: _buildImageContainer(context, image, index),
    );
  }

  /// 2画像レイアウト（横並び）
  Widget _buildTwoImages(
    BuildContext context, 
    List<bsky.EmbedImage> imageList,
    BoxConstraints constraints,
  ) {
    return Container(
      constraints: constraints,
      child: Row(
        children: [
          Expanded(
            child: _buildImageContainer(context, imageList[0], 0),
          ),
          SizedBox(width: spacing),
          Expanded(
            child: _buildImageContainer(context, imageList[1], 1),
          ),
        ],
      ),
    );
  }

  /// 3画像レイアウト（1つ大きく + 2つ縦並び）
  Widget _buildThreeImages(
    BuildContext context, 
    List<bsky.EmbedImage> imageList,
    BoxConstraints constraints,
  ) {
    return Container(
      constraints: constraints,
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: _buildImageContainer(context, imageList[0], 0),
          ),
          SizedBox(width: spacing),
          Expanded(
            child: Column(
              children: [
                Expanded(
                  child: _buildImageContainer(context, imageList[1], 1),
                ),
                SizedBox(height: spacing),
                Expanded(
                  child: _buildImageContainer(context, imageList[2], 2),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 4画像以上のグリッドレイアウト（2x2）
  Widget _buildGridImages(
    BuildContext context, 
    List<bsky.EmbedImage> imageList,
    BoxConstraints constraints,
  ) {
    return Container(
      constraints: constraints,
      child: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildImageContainer(context, imageList[0], 0),
                ),
                SizedBox(width: spacing),
                Expanded(
                  child: _buildImageContainer(context, imageList[1], 1),
                ),
              ],
            ),
          ),
          SizedBox(height: spacing),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildImageContainer(context, imageList[2], 2),
                ),
                if (imageList.length > 3) ...[
                  SizedBox(width: spacing),
                  Expanded(
                    child: _buildImageContainer(context, imageList[3], 3),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 個別画像コンテナの構築
  Widget _buildImageContainer(
    BuildContext context, 
    bsky.EmbedImage image, 
    int index,
  ) {
    return GestureDetector(
      onTap: () => onImageTap?.call(image, index),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: _buildImageContent(context, image),
      ),
    );
  }

  /// 画像コンテンツの構築
  Widget _buildImageContent(BuildContext context, bsky.EmbedImage image) {
    final theme = Theme.of(context);
    
    // TODO: 実際のBluesky APIから画像を取得する実装
    // 現在はモック実装として代替表示を使用
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: theme.colorScheme.surfaceVariant,
      child: Stack(
        children: [
          // プレースホルダー画像
          Center(
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
                  '画像',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          
          // 代替テキストの表示
          if (image.alt.isNotEmpty)
            Positioned(
              bottom: 4.0,
              left: 4.0,
              right: 4.0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6.0,
                  vertical: 4.0,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(4.0),
                ),
                child: Text(
                  image.alt,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white,
                    fontSize: 10.0,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// デバッグ用：画像情報を取得
  List<String> getImageInfo() {
    return images.images.map((image) {
      return 'Image: ${image.image.ref}, Alt: ${image.alt}';
    }).toList();
  }
}