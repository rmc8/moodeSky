# Post → Embedding データフロー詳細ドキュメント

## 概要

このドキュメントは、Postデータから埋め込みコンテンツ（embeddings）が表示されるまでの完全なデータフローを説明します。AT Protocolの埋め込みシステムと統合されたコンポーネント間の連携を理解するための参考資料です。

## データフロー全体図

```
1. BlueskyAPI (AT Protocol)
   ↓
2. TimelineService.getTimeline()
   ↓
3. DeckColumn.svelte (API→SimplePostマッピング + 重複排除)
   ↓
4. PostCard.svelte (埋め込み検出 + EmbedRenderer呼び出し)
   ↓
5. EmbedRenderer.svelte (型判定 + 適切な埋め込みコンポーネント選択)
   ↓
6. 個別埋め込みコンポーネント (ImageEmbed, VideoEmbed, ExternalLinkEmbed, RecordEmbed, RecordWithMediaEmbed)
```

## 詳細データフロー

### 1. API レスポンス (AT Protocol)

**場所**: Bluesky API  
**データ形式**: AT Protocol Feed Response

```json
{
  "feed": [
    {
      "post": {
        "uri": "at://did:plc:xxx/app.bsky.feed.post/xxx",
        "cid": "xxx",
        "author": { "did": "xxx", "handle": "user.bsky.social", ... },
        "record": { "text": "投稿テキスト", ... },
        "embed": {
          "$type": "app.bsky.embed.images#view",
          "images": [...]
        },
        "embeds": [...], // 複数埋め込みの場合
        "replyCount": 0,
        "repostCount": 5,
        "likeCount": 10
      }
    }
  ]
}
```

### 2. TimelineService データ取得

**ファイル**: `src/lib/services/timelineService.ts`  
**関数**: `getTimeline(account: Account, agent: Agent)`

```typescript
const response = await agent.agent.getTimeline({ limit: 50 });
return response.data.feed; // 生のAT Protocolデータ
```

**特徴**:
- Agent注入による認証済みリクエスト
- 最大50件の投稿を取得
- エラーハンドリング（認証期限切れ、ネットワークエラー等）

### 3. SimplePost変換 + 重複排除 (DeckColumn.svelte)

**ファイル**: `src/lib/deck/components/DeckColumn.svelte`  
**処理**: API応答を`SimplePost`形式に変換 + 重複URI排除

```typescript
// 1. AT Protocol → SimplePost マッピング
const simplePosts: SimplePost[] = timelineData.map((item: any) => {
  const post = item.post || item;
  return {
    uri: post.uri,
    cid: post.cid,
    author: { ... },
    text: post.record?.text || '',
    embed: post.embed,        // 単一埋め込み
    embeds: post.embeds,      // 複数埋め込み
    replyCount: post.replyCount,
    // ...その他のフィールド
  };
});

// 2. 重複URI排除 (each_key_duplicate エラー対策)
const deduplicationMap = new Map<string, SimplePost>();
for (const post of simplePosts) {
  if (!deduplicationMap.has(post.uri)) {
    deduplicationMap.set(post.uri, post);
  }
}
const deduplicatedPosts = Array.from(deduplicationMap.values());
```

**重要な変更点**:
- `embed`と`embeds`フィールドが正しくマッピングされている
- Map-based重複排除でSvelteの`each_key_duplicate`エラーを解決
- 埋め込み統計ログを出力

### 4. PostCard埋め込み処理

**ファイル**: `src/lib/components/PostCard.svelte`  
**処理**: 埋め込みデータの統合 + EmbedRenderer呼び出し

```typescript
// 埋め込みコンテンツの存在チェック
const hasEmbeds = $derived(() => {
  return !!(post.embed || (post.embeds && post.embeds.length > 0));
});

// embedまたはembedsの統一化
const embedsData = $derived(() => {
  if (post.embeds && post.embeds.length > 0) {
    return post.embeds; // 複数埋め込み優先
  } else if (post.embed) {
    return post.embed;  // 単一埋め込み
  }
  return null;
});
```

**表示位置**:
```svelte
<!-- 投稿内容 -->
<div class="text-themed text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
  {post.text}
</div>

<!-- 埋め込みコンテンツエリア（正しい位置） -->
{#if hasEmbeds()}
  <div class="mb-3">
    <EmbedRenderer embeds={embedsData()} ... />
  </div>
{/if}

<!-- アクションボタンエリア -->
<footer class="flex items-center justify-between">
  <!-- 返信、リポスト、いいねボタン -->
</footer>
```

### 5. EmbedRenderer型判定・ルーティング

**ファイル**: `src/lib/components/embeddings/EmbedRenderer.svelte`  
**処理**: 埋め込みタイプの自動判定と適切なコンポーネント選択

```typescript
// 埋め込みデータの正規化（配列統一）
const normalizedEmbeds = $derived(() => {
  if (!embeds) return [];
  return Array.isArray(embeds) ? embeds.slice(0, maxEmbeds) : [embeds];
});

// 型判定とコンポーネント選択
const renderEmbed = (embed: Embed | EmbedView, index: number) => {
  const embedType = getEmbedType(embed); // 'images', 'video', 'external', 'record', 'recordWithMedia'
  return { type: embedType, embed, error: null };
};
```

**コンポーネントマッピング**:
```svelte
{#if type === 'images'}
  <ImageEmbed embed={embed as any} ... />
{:else if type === 'video'}
  <VideoEmbed embed={embed as any} ... />
{:else if type === 'external'}
  <ExternalLinkEmbed embed={embed as any} ... />
{:else if type === 'record'}
  <RecordEmbed embed={embed as any} ... />
{:else if type === 'recordWithMedia'}
  <RecordWithMediaEmbed embed={embed as any} ... />
{/if}
```

### 6. 個別埋め込みコンポーネント

#### ImageEmbed (画像埋め込み)
- **対応タイプ**: `app.bsky.embed.images#view`
- **機能**: 画像ギャラリー、アスペクト比対応、レイジーローディング、クリック拡大

#### VideoEmbed (動画埋め込み)
- **対応タイプ**: `app.bsky.embed.video#view`
- **機能**: 動画再生、コントロール、プログレスバー、フルスクリーン対応

#### ExternalLinkEmbed (外部リンク埋め込み)
- **対応タイプ**: `app.bsky.embed.external#view`
- **機能**: リンクプレビュー、サムネイル、メタデータ表示

#### RecordEmbed (記録埋め込み = 引用投稿)
- **対応タイプ**: `app.bsky.embed.record#view`
- **機能**: 引用投稿表示、ネスト深度制限、クリックナビゲーション

#### RecordWithMediaEmbed (記録+メディア複合埋め込み)
- **対応タイプ**: `app.bsky.embed.recordWithMedia#view`
- **機能**: 引用投稿とメディアの組み合わせ表示、レイアウト調整

## 型定義とインターフェース

### SimplePost型
```typescript
export interface SimplePost {
  uri: string;           // AT Protocol URI (一意キー)
  cid: string;           // Content ID
  author: PostAuthor;    // 作者情報
  text: string;          // 投稿テキスト
  embed?: Embed | EmbedView;        // 単一埋め込み
  embeds?: (Embed | EmbedView)[];   // 複数埋め込み
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  createdAt: string;
  indexedAt: string;
}
```

### 埋め込みタイプ階層
```typescript
// ベースタイプ
type Embed = ImageEmbed | VideoEmbed | ExternalEmbed | RecordEmbed | RecordWithMediaEmbed;
type EmbedView = ImageEmbedView | VideoEmbedView | ExternalEmbedView | RecordEmbedView | RecordWithMediaEmbedView;

// 具体的な埋め込みタイプ
interface ImageEmbed { $type: 'app.bsky.embed.images'; images: ImageItem[]; }
interface VideoEmbed { $type: 'app.bsky.embed.video'; video: VideoItem; }
interface ExternalEmbed { $type: 'app.bsky.embed.external'; external: ExternalItem; }
interface RecordEmbed { $type: 'app.bsky.embed.record'; record: RecordRef; }
interface RecordWithMediaEmbed { $type: 'app.bsky.embed.recordWithMedia'; record: RecordRef; media: Embed; }
```

## エラーハンドリング

### 重複URI処理
- **問題**: AT Protocolフィードに同じpost.uriが複数含まれる
- **解決**: Map-based重複排除でSvelteの`each_key_duplicate`エラーを解決
- **実装**: DeckColumn.svelte lines 355-381

### 型安全性
- **問題**: TypeScript型エラー（Generic embed型 vs 具体的コンポーネント型）
- **解決**: `as any`キャストでEmbedRenderer内の型強制
- **実装**: EmbedRenderer.svelte lines 221-256

### 埋め込みエラー
- **問題**: 不正な埋め込みデータ、読み込み失敗
- **解決**: バリデーション、エラー境界、フォールバック表示
- **実装**: 各埋め込みコンポーネント内のエラーハンドリング

## デバッグとモニタリング

### ログ出力
```typescript
console.log('📋 [DeckColumn] Timeline deduplication stats:', {
  originalCount: simplePosts.length,
  deduplicatedCount: deduplicatedPosts.length,
  duplicatesRemoved: simplePosts.length - deduplicatedPosts.length,
  embedStats: { withEmbed: 0, withEmbeds: 0, total: 0 }
});
```

### デバッグモード
```svelte
<EmbedRenderer embeds={post.embeds} debug={true} />
```

デバッグモードでは以下の情報を表示:
- 埋め込み総数・有効数
- 埋め込みタイプ別統計
- エラー詳細メッセージ

## パフォーマンス最適化

### レイジーローディング
- 画像: `loading="lazy"`対応
- 埋め込み: 表示制限 (`maxEmbeds=3`)

### メモリ効率
- 重複排除によるメモリ使用量削減
- 大量埋め込みデータの制限表示

### レンダリング最適化
- Svelte 5 runesによるリアクティブ計算
- 条件付きレンダリングによる不要な計算回避

## トラブルシューティング

### よくある問題

1. **タイムラインが表示されない**
   - 原因: `each_key_duplicate`エラー
   - 確認: ブラウザコンソールで重複URI検出
   - 解決: 重複排除ロジックが正常動作することを確認

2. **埋め込みが表示されない**
   - 原因: `embed`/`embeds`フィールドマッピング漏れ
   - 確認: DeckColumn.svelte lines 346-347
   - 解決: SimplePost変換時にembed要素を含める

3. **TypeScriptエラー**
   - 原因: 埋め込み型の複雑な継承関係
   - 確認: svelte-check実行
   - 解決: 適切な型キャスト (`as any`)

### デバッグ手順

1. **コンソールログ確認**
   ```
   📋 [DeckColumn] Timeline deduplication stats
   ```

2. **埋め込み統計確認**
   ```typescript
   embedStats: { withEmbed: 2, withEmbeds: 1, total: 31 }
   ```

3. **EmbedRendererデバッグモード**
   ```svelte
   <EmbedRenderer debug={true} />
   ```

## まとめ

このデータフローにより、AT Protocolの複雑な埋め込みシステムが統一されたインターフェースでレンダリングされます。重複排除ロジックによりSvelteの制約を回避し、型安全性を保ちながら拡張可能な埋め込みシステムを実現しています。

埋め込み表示は投稿テキストとアクションボタンの間の正しい位置に配置され、ユーザーエクスペリエンスとアクセシビリティを考慮した実装となっています。