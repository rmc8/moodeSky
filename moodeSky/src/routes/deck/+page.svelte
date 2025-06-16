<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // 仮のタイムラインデータ
  const timelineData = [
    {
      id: 1,
      author: '@alice.bsky.social',
      displayName: 'Alice',
      content: 'こんにちは！新しい投稿です。',
      timestamp: '2分前',
      likes: 12,
      reposts: 3,
      replies: 5
    },
    {
      id: 2,
      author: '@bob.bsky.social',
      displayName: 'Bob',
      content: 'Blueskyの新機能について調べています。AT Protocolって面白いですね！',
      timestamp: '15分前',
      likes: 8,
      reposts: 2,
      replies: 1
    },
    {
      id: 3,
      author: '@charlie.bsky.social',
      displayName: 'Charlie',
      content: '今日はいい天気です ☀️ 散歩に行ってきます！',
      timestamp: '1時間前',
      likes: 24,
      reposts: 7,
      replies: 3
    }
  ];

  // 一方通行遷移制御: ブラウザバックを防ぐ
  onMount(() => {
    // 現在のURLを履歴に追加（戻るボタンを無効化）
    history.pushState(null, '', window.location.href);
    
    // popstateイベントをリッスンして戻る操作を防ぐ
    const handlePopState = () => {
      history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  async function logout() {
    await goto('/login');
  }
</script>

<main class="deck-container">
  <header class="deck-header">
    <div class="header-content">
      <h1>moodeSky</h1>
      <button class="logout-button" on:click={logout}>
        ログアウト
      </button>
    </div>
  </header>

  <div class="deck-layout">
    <aside class="sidebar">
      <nav class="sidebar-nav">
        <button class="nav-item active">
          <span class="nav-icon">🏠</span>
          ホーム
        </button>
        <button class="nav-item">
          <span class="nav-icon">🔔</span>
          通知
        </button>
        <button class="nav-item">
          <span class="nav-icon">🔍</span>
          検索
        </button>
        <button class="nav-item">
          <span class="nav-icon">📝</span>
          投稿
        </button>
      </nav>
    </aside>

    <main class="deck-main">
      <div class="deck-columns">
        <div class="column">
          <div class="column-header">
            <h2>ホームタイムライン</h2>
            <button class="refresh-button">🔄</button>
          </div>
          
          <div class="timeline">
            {#each timelineData as post (post.id)}
              <article class="post">
                <div class="post-header">
                  <div class="post-author">
                    <div class="author-avatar">
                      {post.displayName.charAt(0)}
                    </div>
                    <div class="author-info">
                      <span class="author-name">{post.displayName}</span>
                      <span class="author-handle">{post.author}</span>
                    </div>
                  </div>
                  <time class="post-time">{post.timestamp}</time>
                </div>
                
                <div class="post-content">
                  <p>{post.content}</p>
                </div>
                
                <div class="post-actions">
                  <button class="action-button">
                    💬 {post.replies}
                  </button>
                  <button class="action-button">
                    🔄 {post.reposts}
                  </button>
                  <button class="action-button">
                    ❤️ {post.likes}
                  </button>
                  <button class="action-button">
                    📤
                  </button>
                </div>
              </article>
            {/each}
          </div>
        </div>
        
        <!-- 将来的に追加カラム用のスペース -->
        <div class="column placeholder">
          <div class="column-header">
            <h2>通知</h2>
          </div>
          <div class="placeholder-content">
            <p>通知カラムは今後実装予定です</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</main>

<style>
  .deck-container {
    min-height: 100vh;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
  }

  .deck-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header-content h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .logout-button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s ease;
  }

  .logout-button:hover {
    background: #dc2626;
  }

  .deck-layout {
    display: flex;
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .sidebar {
    width: 200px;
    background: white;
    border-right: 1px solid #e2e8f0;
    padding: 1rem;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    color: #64748b;
    font-size: 0.9rem;
  }

  .nav-item:hover {
    background: #f1f5f9;
  }

  .nav-item.active {
    background: #3b82f6;
    color: white;
  }

  .nav-icon {
    font-size: 1.2rem;
  }

  .deck-main {
    flex: 1;
    padding: 1rem;
  }

  .deck-columns {
    display: flex;
    gap: 1rem;
    height: 100%;
  }

  .column {
    flex: 1;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    max-width: 400px;
  }

  .column.placeholder {
    opacity: 0.6;
  }

  .column-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .column-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .refresh-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .refresh-button:hover {
    background: #e2e8f0;
  }

  .timeline {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }

  .post {
    border-bottom: 1px solid #f1f5f9;
    padding: 1rem;
    transition: background 0.2s ease;
  }

  .post:hover {
    background: #f8fafc;
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .post-author {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .author-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .author-info {
    display: flex;
    flex-direction: column;
  }

  .author-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.9rem;
  }

  .author-handle {
    color: #64748b;
    font-size: 0.8rem;
  }

  .post-time {
    color: #94a3b8;
    font-size: 0.8rem;
  }

  .post-content {
    margin-bottom: 1rem;
  }

  .post-content p {
    margin: 0;
    line-height: 1.5;
    color: #334155;
  }

  .post-actions {
    display: flex;
    gap: 1rem;
  }

  .action-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #64748b;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .action-button:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .placeholder-content {
    padding: 2rem;
    text-align: center;
    color: #94a3b8;
  }

  @media (prefers-color-scheme: dark) {
    .deck-container {
      background: #0f172a;
    }

    .deck-header {
      background: #1e293b;
      border-bottom-color: #334155;
    }

    .header-content h1 {
      color: #f1f5f9;
    }

    .sidebar {
      background: #1e293b;
      border-right-color: #334155;
    }

    .nav-item {
      color: #94a3b8;
    }

    .nav-item:hover {
      background: #334155;
    }

    .column {
      background: #1e293b;
    }

    .column-header {
      background: #334155;
      border-bottom-color: #475569;
    }

    .column-header h2 {
      color: #f1f5f9;
    }

    .post {
      border-bottom-color: #334155;
    }

    .post:hover {
      background: #334155;
    }

    .author-name {
      color: #f1f5f9;
    }

    .post-content p {
      color: #cbd5e1;
    }

    .action-button:hover {
      background: #334155;
    }
  }

  @media (max-width: 768px) {
    .deck-layout {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      order: 2;
    }

    .sidebar-nav {
      flex-direction: row;
      justify-content: space-around;
    }

    .deck-columns {
      flex-direction: column;
    }

    .column {
      max-width: none;
    }
  }
</style>