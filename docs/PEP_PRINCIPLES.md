# 🐍 PEP思想のTauriプロジェクトへの適用

このドキュメントでは、PythonのPEP (Python Enhancement Proposal) 思想と書式をmoodeSkyプロジェクトに適用する方法を説明します。

## 📖 PEP思想とは

PEP思想は、Pythonコミュニティが長年培ってきた優れた開発哲学とベストプラクティスの集合体です。この思想は言語を超えて適用できる普遍的な価値があります。

## 🎯 The Zen of Python (PEP 20) の適用

### 原則とTauriプロジェクトでの実践

#### 1. "Beautiful is better than ugly"
**美しいコードを書く**

```rust
// ❌ 読みにくいコード
async fn f(x:String,y:Vec<String>)->Result<serde_json::Value,String>{if x.is_empty(){return Err("error".to_string());}Ok(serde_json::json!({"data":y}))}

// ✅ 美しいコード
#[tauri::command]
async fn process_bluesky_data(
    session_id: String,
    post_ids: Vec<String>,
) -> Result<serde_json::Value, String> {
    if session_id.is_empty() {
        return Err("Session ID is required".to_string());
    }

    let response_data = serde_json::json!({
        "posts": post_ids,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    Ok(response_data)
}
```

```typescript
// ❌ 読みにくいコード
const fetchData=(id:string)=>{if(!id)throw new Error('No ID');return invoke('get_data',{id}).then(r=>r.data).catch(e=>console.error(e));}

// ✅ 美しいコード
async function fetchBlueskyPost(postId: string): Promise<Post | null> {
    if (!postId.trim()) {
        throw new Error('Post ID is required');
    }

    try {
        const result = await invoke('fetch_bluesky_post', { postId });
        return result as Post;
    } catch (error) {
        console.error('Failed to fetch post:', error);
        return null;
    }
}
```

#### 2. "Explicit is better than implicit"
**明示的な設計を心がける**

```rust
// ❌ 暗黙的
#[tauri::command]
async fn login(user: String, pass: String) -> bool {
    // 戻り値がboolだけでは詳細がわからない
}

// ✅ 明示的
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResult {
    pub success: bool,
    pub session_id: Option<String>,
    pub error_message: Option<String>,
    pub expires_at: Option<String>,
}

#[tauri::command]
async fn bluesky_login(
    identifier: String,
    password: String,
) -> Result<LoginResult, String> {
    // 結果が明確
}
```

```typescript
// ❌ 暗黙的
interface Post {
    id: string;
    text: string;
    meta: any; // 何が入るかわからない
}

// ✅ 明示的
interface BlueskyPost {
    uri: string;
    cid: string;
    text: string;
    createdAt: string;
    author: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    replyCount: number;
    repostCount: number;
    likeCount: number;
    images?: Array<{
        alt: string;
        url: string;
        aspectRatio?: { width: number; height: number };
    }>;
}
```

#### 3. "Simple is better than complex"
**シンプルさを重視する**

```rust
// ❌ 複雑
struct ComplexHandler {
    processors: Vec<Box<dyn Processor>>,
    middlewares: Vec<Box<dyn Middleware>>,
    interceptors: HashMap<String, Box<dyn Interceptor>>,
}

// ✅ シンプル
#[tauri::command]
async fn create_post(session: AuthSession, text: String) -> Result<String, String> {
    let client = BlueskyClient::new(&session.access_token);
    client.create_post(text).await
}
```

#### 4. "Readability counts"
**可読性を重視する**

```svelte
<!-- ❌ 読みにくい -->
{#if posts && posts.length > 0 && !loading && !error}
    {#each posts.filter(p => p.author.did !== $currentUser.did && !p.deleted) as post}
        <div class="{post.liked ? 'liked' : ''} {post.reposted ? 'reposted' : ''}">{post.text}</div>
    {/each}
{/if}

<!-- ✅ 読みやすい -->
{#if hasValidPosts}
    {#each visiblePosts as post}
        <PostCard 
            {post}
            isLiked={post.liked}
            isReposted={post.reposted}
        />
    {/each}
{/if}

<script lang="ts">
    $: hasValidPosts = posts?.length > 0 && !loading && !error;
    $: visiblePosts = posts?.filter(post => 
        post.author.did !== $currentUser.did && 
        !post.deleted
    ) ?? [];
</script>
```

#### 5. "There should be one obvious way to do it"
**一つの明確な方法を提供する**

```rust
// ❌ 複数の似たような方法
impl BlueskyClient {
    async fn get_timeline(&self) -> Result<Vec<Post>, Error> { }
    async fn fetch_timeline(&self) -> Result<Vec<Post>, Error> { }
    async fn timeline(&self) -> Result<Vec<Post>, Error> { }
}

// ✅ 一つの明確な方法
impl BlueskyClient {
    /// タイムラインを取得します
    async fn get_timeline(&self, limit: Option<u32>) -> Result<Timeline, BlueskyError> {
        // 一つの確立された方法
    }
}
```

## 📝 PEP 8スタイルの適用

### コードフォーマット規約

#### Rust (rustfmt準拠)
```rust
// ✅ 推奨スタイル
#[tauri::command]
async fn fetch_bluesky_notifications(
    session: AuthSession,
    limit: Option<u32>,
) -> Result<NotificationResponse, String> {
    let client = create_authenticated_client(&session)?;
    
    let notifications = client
        .get_notifications(limit.unwrap_or(50))
        .await
        .map_err(|e| format!("Failed to fetch notifications: {}", e))?;

    Ok(NotificationResponse {
        notifications,
        unread_count: notifications.iter().filter(|n| !n.is_read).count(),
    })
}
```

#### TypeScript (Prettier準拠)
```typescript
// ✅ 推奨スタイル
export class BlueskyService {
    private readonly apiClient: BlueskyApiClient;

    constructor(private session: AuthSession) {
        this.apiClient = new BlueskyApiClient(session.accessToken);
    }

    async createPost(content: CreatePostRequest): Promise<PostResult> {
        const { text, images, replyTo } = content;

        if (!text.trim() && (!images || images.length === 0)) {
            throw new Error('Post must contain text or images');
        }

        return await this.apiClient.post('com.atproto.repo.createRecord', {
            repo: this.session.did,
            collection: 'app.bsky.feed.post',
            record: {
                text,
                createdAt: new Date().toISOString(),
                ...(images && { embed: { $type: 'app.bsky.embed.images', images } }),
                ...(replyTo && { reply: replyTo }),
            },
        });
    }
}
```

### 命名規約

#### Rust
```rust
// ✅ 推奨命名
pub struct BlueskyAuthSession {
    pub access_jwt: String,
    pub refresh_jwt: String,
    pub user_did: String,
    pub handle: String,
}

pub enum PostVisibility {
    Public,
    Unlisted,
    FollowersOnly,
}

pub trait BlueskyApiClient {
    async fn create_post(&self, request: CreatePostRequest) -> Result<PostResult, ApiError>;
    async fn delete_post(&self, post_uri: &str) -> Result<(), ApiError>;
    async fn like_post(&self, post_uri: &str, post_cid: &str) -> Result<String, ApiError>;
}
```

#### TypeScript
```typescript
// ✅ 推奨命名
export interface BlueskyPost {
    uri: string;
    cid: string;
    authorDid: string;
    authorHandle: string;
    text: string;
    createdAt: string;
    replyCount: number;
    repostCount: number;
    likeCount: number;
}

export class TimelineManager {
    private readonly maxCacheSize = 1000;
    private readonly refreshInterval = 30000; // 30秒

    async refreshTimeline(): Promise<BlueskyPost[]> {
        // 実装
    }

    private async fetchFromApi(): Promise<BlueskyPost[]> {
        // 実装
    }
}
```

## 📚 PEP 257ドキュメント文字列の適用

### Rust ドキュメント
```rust
/// Bluesky AT Protocol クライアント
/// 
/// このクライアントは認証、投稿作成、タイムライン取得などの
/// 基本的なBluesky操作を提供します。
/// 
/// # Examples
/// 
/// ```rust
/// let client = BlueskyClient::new("https://bsky.social").await?;
/// let session = client.login("alice.bsky.social", "app-password").await?;
/// let posts = client.get_timeline(&session, Some(20)).await?;
/// ```
/// 
/// # Errors
/// 
/// このクライアントは以下の場合にエラーを返します：
/// - ネットワーク接続エラー
/// - 認証エラー
/// - レート制限エラー
/// - AT Protocol APIエラー
pub struct BlueskyClient {
    base_url: String,
    http_client: reqwest::Client,
}

impl BlueskyClient {
    /// 新しいBlueskyクライアントを作成
    /// 
    /// # Arguments
    /// 
    /// * `base_url` - AT ProtocolサーバーのベースURL（例: "https://bsky.social"）
    /// 
    /// # Returns
    /// 
    /// 設定されたクライアントインスタンス
    /// 
    /// # Examples
    /// 
    /// ```rust
    /// let client = BlueskyClient::new("https://bsky.social");
    /// ```
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            http_client: reqwest::Client::new(),
        }
    }
}
```

### TypeScript ドキュメント
```typescript
/**
 * Bluesky投稿管理クラス
 * 
 * 投稿の作成、削除、更新、取得を管理します。
 * AT Protocolの仕様に準拠した操作を提供します。
 * 
 * @example
 * ```typescript
 * const manager = new PostManager(session);
 * const post = await manager.createPost({
 *   text: "Hello Bluesky!",
 *   images: [imageBlob]
 * });
 * ```
 */
export class PostManager {
    /**
     * 新しい投稿を作成
     * 
     * @param request - 投稿作成リクエスト
     * @param request.text - 投稿テキスト（最大300文字）
     * @param request.images - 添付画像（最大4枚）
     * @param request.replyTo - リプライ先の投稿情報
     * @returns 作成された投稿の情報
     * @throws {PostCreationError} 投稿作成に失敗した場合
     * 
     * @example
     * ```typescript
     * const post = await manager.createPost({
     *   text: "新しい投稿です",
     *   images: [await imageToBlob(imageFile)]
     * });
     * console.log(`投稿が作成されました: ${post.uri}`);
     * ```
     */
    async createPost(request: CreatePostRequest): Promise<PostResult> {
        // 実装
    }
}
```

## 🔄 PEPプロセスの適用

### GitHub Issuesでの設計議論

PEPの提案・議論・決定プロセスをGitHub Issuesで実践：

#### Issue作成例
```markdown
# [RFC] Bluesky リアルタイム通知システムの設計

## 概要
Blueskyのリアルタイム通知機能を実装する設計提案です。

## 動機
- ユーザーがリアルタイムで通知を受け取れるようにする
- WebSocket接続を効率的に管理する
- オフライン時の通知ハンドリング

## 提案する仕様

### アーキテクチャ
1. WebSocket接続管理
2. 通知キューイング
3. UI更新システム

### API設計
```rust
pub trait NotificationService {
    async fn start_realtime_connection(&self) -> Result<(), NotificationError>;
    async fn stop_realtime_connection(&self) -> Result<(), NotificationError>;
    fn subscribe_to_notifications(&self, callback: NotificationCallback);
}
```

## 実装計画
1. Phase 1: WebSocket基盤実装
2. Phase 2: 通知処理ロジック
3. Phase 3: UI統合

## 互換性への影響
- 既存のAPI呼び出しパターンに影響なし
- 新しい依存関係: `tokio-tungstenite`

## 代替案
1. Polling方式での実装
2. Server-Sent Events使用

## 参考実装
- Bluesky公式WebアプリのWebSocket実装
- AT Protocol firehose仕様

## 議論ポイント
- [ ] WebSocket切断時の再接続戦略
- [ ] 通知の永続化方法
- [ ] パフォーマンス要件
```

### コードレビューでのPEP原則適用

```markdown
## レビューチェックリスト

### PEP原則準拠
- [ ] コードが美しく読みやすい (Beautiful is better than ugly)
- [ ] 意図が明示的に表現されている (Explicit is better than implicit)  
- [ ] 実装がシンプルである (Simple is better than complex)
- [ ] 一つの明確な方法で実装されている (One obvious way to do it)

### コードスタイル
- [ ] rustfmt/prettier準拠
- [ ] 適切な命名規約
- [ ] 十分なドキュメント

### アーキテクチャ
- [ ] 責任の分離
- [ ] エラーハンドリング
- [ ] テスタビリティ
```

## 🎯 moodeSkyでの実践例

### プロジェクト構造
```
moodeSky/
├── src/                    # フロントエンド (SvelteKit)
│   ├── lib/
│   │   ├── bluesky/       # Bluesky関連ロジック
│   │   ├── components/    # 再利用可能コンポーネント  
│   │   └── utils/         # ユーティリティ関数
│   └── routes/            # ページルーティング
├── src-tauri/             # バックエンド (Rust)
│   ├── src/
│   │   ├── bluesky/       # AT Protocol実装
│   │   ├── storage/       # データ永続化
│   │   └── commands/      # Tauriコマンド
└── docs/                  # ドキュメント
    ├── api/              # API仕様
    ├── design/           # 設計文書
    └── guides/           # 開発ガイド
```

### 継続的な品質向上

#### 自動化されたチェック
- **rustfmt** + **clippy**: Rustコード品質
- **prettier** + **eslint**: TypeScript/Svelteコード品質  
- **ドキュメント生成**: `cargo doc` + TSDoc
- **テストカバレッジ**: 品質メトリクス追跡

#### 定期的なレビュー
- 週次: コード品質レビュー
- 月次: アーキテクチャレビュー
- リリース前: 全体設計レビュー

## 🚀 実践のメリット

PEP思想をTauriプロジェクトに適用することで：

1. **コード品質向上**: 読みやすく保守しやすいコード
2. **開発効率向上**: 一貫したパターンで迷いが少ない
3. **チーム連携向上**: 共通の価値観と手法
4. **長期保守性**: 技術的負債の蓄積防止
5. **新メンバーの理解促進**: 明確な規約とドキュメント

## 📖 参考資料

- [PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 20 - The Zen of Python](https://peps.python.org/pep-0020/)
- [PEP 257 - Docstring Conventions](https://peps.python.org/pep-0257/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)