/**
 * LRU (Least Recently Used) Cache実装
 * O(1)でのアクセス、挿入、削除をサポート
 */

export interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

export class LRUCache<K, V> {
  private capacity: number;
  private size: number;
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V>;
  private tail: LRUNode<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.size = 0;
    this.cache = new Map();

    // ダミーのhead/tailノードを作成（実装を簡単にするため）
    this.head = { key: null as any, value: null as any, prev: null, next: null };
    this.tail = { key: null as any, value: null as any, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * 値を取得（O(1)）
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) {
      return undefined;
    }

    // アクセスされたノードを最前面に移動
    this.moveToHead(node);
    return node.value;
  }

  /**
   * 値を設定（O(1)）
   */
  set(key: K, value: V): void {
    // 容量が0の場合は何もしない
    if (this.capacity <= 0) {
      return;
    }

    const existingNode = this.cache.get(key);

    if (existingNode) {
      // 既存のキーの場合は値を更新して最前面に移動
      existingNode.value = value;
      this.moveToHead(existingNode);
    } else {
      // 新しいキーの場合
      const newNode: LRUNode<K, V> = {
        key,
        value,
        prev: null,
        next: null
      };

      // 容量チェック
      if (this.size >= this.capacity) {
        // 最も使われていないノード（tail直前）を削除
        const tail = this.removeTail();
        if (tail) {
          this.cache.delete(tail.key);
          this.size--;
        }
      }

      // 新しいノードを追加
      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.size++;
    }
  }

  /**
   * キーが存在するかチェック（O(1)）
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 値を削除（O(1)）
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.size--;
    return true;
  }

  /**
   * すべてのキーを削除
   */
  clear(): void {
    this.cache.clear();
    this.size = 0;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * 現在のサイズを取得
   */
  get currentSize(): number {
    return this.size;
  }

  /**
   * すべてのキーを取得
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.head.next;
    while (current && current !== this.tail) {
      keys.push(current.key);
      current = current.next;
    }
    return keys;
  }

  /**
   * すべての値を取得
   */
  values(): V[] {
    const values: V[] = [];
    let current = this.head.next;
    while (current && current !== this.tail) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }

  /**
   * [key, value]のペアを取得
   */
  entries(): [K, V][] {
    const entries: [K, V][] = [];
    let current = this.head.next;
    while (current && current !== this.tail) {
      entries.push([current.key, current.value]);
      current = current.next;
    }
    return entries;
  }

  // ===================================================================
  // 内部ヘルパーメソッド
  // ===================================================================

  /**
   * ノードをhead直後に追加
   */
  private addToHead(node: LRUNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  /**
   * ノードを削除
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  /**
   * ノードを最前面に移動
   */
  private moveToHead(node: LRUNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * 末尾のノードを削除して返す
   */
  private removeTail(): LRUNode<K, V> | null {
    const lastNode = this.tail.prev;
    if (lastNode && lastNode !== this.head) {
      this.removeNode(lastNode);
      return lastNode;
    }
    return null;
  }
}