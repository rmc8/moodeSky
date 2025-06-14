// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

// Project imports:
import 'package:moodesky/shared/utils/url_utils.dart';

/// EmbedVideoWidget - AT Protocol 動画埋め込み表示ウィジェット
/// 
/// Bluesky AT Protocolの動画埋め込みデータを表示するウィジェットです。
/// 
/// 対応する動画形式：
/// - 直接動画URL (MP4, MOV, AVI等)
/// - YouTube動画
/// - その他のストリーミングサービス（将来対応予定）
/// 
/// 使用例:
/// ```dart
/// EmbedVideoWidget(
///   embedData: bsky.UEmbedViewVideo(...),
/// )
/// ```
class EmbedVideoWidget extends StatefulWidget {
  /// AT Protocol の動画埋め込みデータ
  final bsky.UEmbedViewVideo? embedData;
  
  /// 動画URL（直接指定する場合）
  final String? videoUrl;
  
  /// 動画のタイトル
  final String? title;
  
  /// 動画の説明
  final String? description;
  
  /// サムネイル画像URL
  final String? thumbnailUrl;
  
  /// 自動再生するかどうか
  final bool autoPlay;
  
  /// ミュート状態で開始するかどうか
  final bool startMuted;
  
  /// ウィジェットの最大高さ
  final double? maxHeight;
  
  /// ウィジェットの最大幅
  final double? maxWidth;

  const EmbedVideoWidget({
    super.key,
    this.embedData,
    this.videoUrl,
    this.title,
    this.description,
    this.thumbnailUrl,
    this.autoPlay = false,
    this.startMuted = true,
    this.maxHeight,
    this.maxWidth,
  });

  @override
  State<EmbedVideoWidget> createState() => _EmbedVideoWidgetState();
}

class _EmbedVideoWidgetState extends State<EmbedVideoWidget> {
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  YoutubePlayerController? _youtubeController;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  String? _videoUrl;
  bool _isYoutubeVideo = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  @override
  void dispose() {
    _disposeControllers();
    super.dispose();
  }

  /// 動画コントローラーを破棄
  void _disposeControllers() {
    _videoController?.dispose();
    _chewieController?.dispose();
    _youtubeController?.dispose();
  }

  /// 動画を初期化
  Future<void> _initializeVideo() async {
    try {
      setState(() {
        _isLoading = true;
        _hasError = false;
        _errorMessage = null;
      });

      // 動画URLを取得
      _videoUrl = _getVideoUrl();
      
      if (_videoUrl == null || _videoUrl!.isEmpty) {
        throw Exception('動画URLが見つかりません');
      }

      // YouTube動画かどうかを判定
      _isYoutubeVideo = _isYouTubeUrl(_videoUrl!);

      if (_isYoutubeVideo) {
        await _initializeYouTubePlayer();
      } else {
        await _initializeVideoPlayer();
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = '動画の読み込みエラー: ${e.toString()}';
      });
    }
  }

  /// 動画URLを取得
  String? _getVideoUrl() {
    // 直接指定されたURLを優先
    if (widget.videoUrl != null && widget.videoUrl!.isNotEmpty) {
      return widget.videoUrl;
    }

    // AT Protocol埋め込みデータから取得
    // 注: 実際のbsky.UEmbedViewVideoの構造に応じて調整が必要
    if (widget.embedData != null) {
      try {
        // TODO: 実際のbluesky パッケージのUEmbedViewVideo構造に合わせて実装
        // 現在はモック実装として基本的な処理のみ
        return null;
      } catch (e) {
        debugPrint('埋め込みデータからのURL取得エラー: $e');
        return null;
      }
    }

    return null;
  }

  /// YouTube動画プレーヤーを初期化
  Future<void> _initializeYouTubePlayer() async {
    final videoId = YoutubePlayer.convertUrlToId(_videoUrl!);
    if (videoId == null) {
      throw Exception('無効なYouTube URL');
    }

    _youtubeController = YoutubePlayerController(
      initialVideoId: videoId,
      flags: YoutubePlayerFlags(
        autoPlay: widget.autoPlay,
        mute: widget.startMuted,
        loop: false,
        hideControls: false,
        controlsVisibleAtStart: true,
        enableCaption: true,
      ),
    );
  }

  /// 通常の動画プレーヤーを初期化
  Future<void> _initializeVideoPlayer() async {
    _videoController = VideoPlayerController.networkUrl(
      Uri.parse(_videoUrl!),
    );

    await _videoController!.initialize();

    _chewieController = ChewieController(
      videoPlayerController: _videoController!,
      autoPlay: widget.autoPlay,
      looping: false,
      showControls: true,
      materialProgressColors: ChewieProgressColors(
        playedColor: Theme.of(context).primaryColor,
        handleColor: Theme.of(context).primaryColor,
        backgroundColor: Colors.grey,
        bufferedColor: Colors.grey[300]!,
      ),
      placeholder: _buildThumbnail(),
      autoInitialize: true,
    );

    if (widget.startMuted) {
      await _videoController!.setVolume(0.0);
    }
  }

  /// YouTube URLかどうかを判定
  bool _isYouTubeUrl(String url) {
    return url.contains('youtube.com') || 
           url.contains('youtu.be') || 
           url.contains('m.youtube.com');
  }

  /// サムネイル画像を構築
  Widget _buildThumbnail() {
    if (widget.thumbnailUrl != null && widget.thumbnailUrl!.isNotEmpty) {
      return Container(
        color: Colors.black,
        child: Center(
          child: Image.network(
            widget.thumbnailUrl!,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildDefaultThumbnail();
            },
          ),
        ),
      );
    }
    return _buildDefaultThumbnail();
  }

  /// デフォルトサムネイルを構築
  Widget _buildDefaultThumbnail() {
    return Container(
      color: Colors.black87,
      child: const Center(
        child: Icon(
          Icons.play_circle_fill,
          size: 64,
          color: Colors.white70,
        ),
      ),
    );
  }

  /// ローディング表示を構築
  Widget _buildLoading() {
    return Container(
      constraints: BoxConstraints(
        maxHeight: widget.maxHeight ?? 300,
        maxWidth: widget.maxWidth ?? double.infinity,
      ),
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
            ),
            SizedBox(height: 16),
            Text(
              '動画を読み込み中...',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// エラー表示を構築
  Widget _buildError() {
    return Container(
      constraints: BoxConstraints(
        maxHeight: widget.maxHeight ?? 200,
        maxWidth: widget.maxWidth ?? double.infinity,
      ),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red[200]!),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 48,
            color: Colors.red[400],
          ),
          const SizedBox(height: 12),
          Text(
            '動画を読み込めません',
            style: TextStyle(
              color: Colors.red[700],
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              style: TextStyle(
                color: Colors.red[600],
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: _initializeVideo,
            icon: const Icon(Icons.refresh),
            label: const Text('再試行'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red[700],
            ),
          ),
        ],
      ),
    );
  }

  /// YouTube動画プレーヤーを構築
  Widget _buildYouTubePlayer() {
    if (_youtubeController == null) {
      return _buildError();
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: widget.maxHeight ?? 300,
        maxWidth: widget.maxWidth ?? double.infinity,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: YoutubePlayer(
          controller: _youtubeController!,
          showVideoProgressIndicator: true,
          bottomActions: [
            CurrentPosition(),
            ProgressBar(
              isExpanded: true,
              colors: ProgressBarColors(
                playedColor: Theme.of(context).primaryColor,
                handleColor: Theme.of(context).primaryColor,
              ),
            ),
            RemainingDuration(),
            FullScreenButton(),
          ],
        ),
      ),
    );
  }

  /// 通常の動画プレーヤーを構築
  Widget _buildVideoPlayer() {
    if (_chewieController == null || _videoController == null) {
      return _buildError();
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: widget.maxHeight ?? 300,
        maxWidth: widget.maxWidth ?? double.infinity,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Chewie(
          controller: _chewieController!,
        ),
      ),
    );
  }

  /// 動画情報を構築
  Widget _buildVideoInfo() {
    if (widget.title == null && widget.description == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.title != null && widget.title!.isNotEmpty) ...[
            Text(
              widget.title!,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
          ],
          if (widget.description != null && widget.description!.isNotEmpty) ...[
            Text(
              widget.description!,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 動画プレーヤー部分
          if (_isLoading)
            _buildLoading()
          else if (_hasError)
            _buildError()
          else if (_isYoutubeVideo)
            _buildYouTubePlayer()
          else
            _buildVideoPlayer(),
          
          // 動画情報部分
          _buildVideoInfo(),
        ],
      ),
    );
  }
}