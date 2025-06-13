// Bluesky統合サービスの新しいエントリーポイント
// 元の巨大ファイル（1665行）を機能別に分割し、保守性を向上

// Project imports:
export 'package:moodesky/services/bluesky/index.dart';

// 後方互換性のための型エイリアス
// これにより既存のコードを破綻させることなく新しいアーキテクチャに移行可能

// Project imports:
import 'package:moodesky/services/bluesky/bluesky_service_v2.dart';

typedef BlueskyService = BlueskyServiceV2;
