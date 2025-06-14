// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:flutter/foundation.dart' show debugPrint;

/// EmbedViewから既存embedウィジェット用の型に変換するユーティリティ
class EmbedConverter {
  /// EmbedView.externalからbsky.EmbedExternalに変換
  static bsky.EmbedExternal? convertToEmbedExternal(dynamic embedViewExternal) {
    try {
      debugPrint('🔄 Converting EmbedView.external to bsky.EmbedExternal');
      debugPrint('  Input type: ${embedViewExternal.runtimeType}');
      
      // EmbedViewExternalからexternalプロパティを取得
      final externalData = embedViewExternal.external;
      if (externalData == null) {
        debugPrint('❌ External data is null');
        return null;
      }
      
      debugPrint('  External data type: ${externalData.runtimeType}');
      
      // 必要なプロパティを抽出
      final uri = externalData.uri as String?;
      final title = externalData.title as String?;
      final description = externalData.description as String?;
      final thumbnail = externalData.thumbnail; // URLまたはBlob
      
      debugPrint('  Extracted: uri=$uri, title=$title, desc=$description, hasThumbnail=${thumbnail != null}');
      
      if (uri == null) {
        debugPrint('❌ URI is required but missing');
        return null;
      }
      
      // タイトルと説明は空文字列で代用可能
      final safeTitle = title ?? '';
      final safeDescription = description ?? '';
      
      // サムネイル処理（URLの場合はbsky.Blobを作成）
      bsky.Blob? thumbnailBlob;
      if (thumbnail != null) {
        if (thumbnail is String) {
          // サムネイルがURL文字列の場合、簡易的なBlobオブジェクトを作成
          // 実際のBluesky APIでは適切なBlob作成が必要
          debugPrint('  Thumbnail URL: $thumbnail');
          // TODO: 適切なBlob作成実装
        } else {
          // 既にBlobオブジェクトの場合
          thumbnailBlob = thumbnail as bsky.Blob?;
        }
      }

      // bsky.Externalオブジェクトを作成
      final external = bsky.External(
        uri: uri,
        title: safeTitle,
        description: safeDescription,
        thumb: thumbnailBlob, // 変換されたBlob
      );
      
      // bsky.EmbedExternalオブジェクトを作成
      final embedExternal = bsky.EmbedExternal(external: external);
      
      debugPrint('✅ Successfully converted to bsky.EmbedExternal');
      return embedExternal;
      
    } catch (e, stackTrace) {
      debugPrint('❌ Error converting to EmbedExternal: $e');
      debugPrint('Stack trace: $stackTrace');
      return null;
    }
  }
  
  /// EmbedView.imagesからbsky.EmbedImagesに変換
  static bsky.EmbedImages? convertToEmbedImages(dynamic embedViewImages) {
    try {
      debugPrint('🔄 Converting EmbedView.images to bsky.EmbedImages');
      debugPrint('  Input type: ${embedViewImages.runtimeType}');
      
      // 後で実装
      debugPrint('⚠️ EmbedImages conversion not yet implemented');
      return null;
      
    } catch (e, stackTrace) {
      debugPrint('❌ Error converting to EmbedImages: $e');
      debugPrint('Stack trace: $stackTrace');
      return null;
    }
  }
  
  /// EmbedView.recordからbsky.EmbedRecordに変換
  static bsky.EmbedRecord? convertToEmbedRecord(dynamic embedViewRecord) {
    try {
      debugPrint('🔄 Converting EmbedView.record to bsky.EmbedRecord');
      debugPrint('  Input type: ${embedViewRecord.runtimeType}');
      
      // 後で実装
      debugPrint('⚠️ EmbedRecord conversion not yet implemented');
      return null;
      
    } catch (e, stackTrace) {
      debugPrint('❌ Error converting to EmbedRecord: $e');
      debugPrint('Stack trace: $stackTrace');
      return null;
    }
  }
  
  /// 変換が可能かどうかをチェック
  static bool canConvertExternal(dynamic embedViewExternal) {
    try {
      final externalData = embedViewExternal?.external;
      return externalData?.uri != null; // URIのみ必須
    } catch (e) {
      return false;
    }
  }
}