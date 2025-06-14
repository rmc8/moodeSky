// Package imports:
import 'package:url_launcher/url_launcher.dart';

/// URL関連のユーティリティ関数
class UrlUtils {
  /// YouTube URLかどうかを判定
  static bool isYouTubeUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    
    return uri.host.contains('youtube.com') || 
           uri.host.contains('youtu.be') ||
           uri.host.contains('m.youtube.com');
  }

  /// YouTube動画IDを抽出
  static String? extractYouTubeVideoId(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;

    // youtube.com形式
    if (uri.host.contains('youtube.com')) {
      return uri.queryParameters['v'];
    }
    
    // youtu.be形式
    if (uri.host.contains('youtu.be')) {
      return uri.pathSegments.isNotEmpty ? uri.pathSegments.first : null;
    }

    return null;
  }

  /// URLを外部ブラウザで開く
  static Future<bool> launchExternalUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      return false;
    }
  }

  /// URLが有効かどうかを判定
  static bool isValidUrl(String url) {
    final uri = Uri.tryParse(url);
    return uri != null && (uri.hasScheme && (uri.scheme == 'http' || uri.scheme == 'https'));
  }

  /// ドメインを抽出
  static String? extractDomain(String url) {
    final uri = Uri.tryParse(url);
    return uri?.host;
  }
}