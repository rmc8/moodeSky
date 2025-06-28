/**
 * AgentManager - アカウント単位でのBskyAgentグローバル管理
 * 
 * 設計思想:
 * - 一つのアカウントに対して一つのAgentインスタンス
 * - 全デッキで同じセッション状態を共有
 * - メモリ効率とAPI接続の最適化
 * - 既存agent.tsの設計思想との整合性
 */

import { Agent } from './agent.js';
import type { Account } from '../types/auth.js';
import { createComponentLogger } from '../utils/logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('AgentManager');

/**
 * AgentManagerクラス
 * アカウント単位でAgentインスタンスを管理するシングルトンサービス
 */
export class AgentManager {
  private agents = new Map<string, Agent>();

  /**
   * 指定されたアカウントのAgentを取得
   * 存在しない場合は新規作成
   */
  getAgent(account: Account): Agent {
    const accountKey = account.profile.did; // DIDをキーとして使用（確実な識別のため）
    
    if (!this.agents.has(accountKey)) {
      log.debug('Creating new Agent instance', { 
        accountId: account.id, 
        did: account.profile.did,
        handle: account.profile.handle 
      });
      
      const agent = new Agent(account);
      this.agents.set(accountKey, agent);
      
      log.debug('Agent instance created and cached', { 
        accountKey, 
        totalAgents: this.agents.size 
      });
    } else {
      log.debug('Returning cached Agent instance', { 
        accountKey, 
        handle: account.profile.handle 
      });
    }

    return this.agents.get(accountKey)!;
  }

  /**
   * 指定されたアカウントのAgentを削除
   * ログアウト時などに使用
   */
  removeAgent(account: Account): boolean {
    const accountKey = account.profile.did;
    
    if (this.agents.has(accountKey)) {
      const agent = this.agents.get(accountKey)!;
      agent.dispose(); // リソース解放
      this.agents.delete(accountKey);
      
      log.debug('Agent instance removed', { 
        accountKey, 
        handle: account.profile.handle,
        remainingAgents: this.agents.size 
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * すべてのAgentを削除
   * アプリケーション終了時などに使用
   */
  removeAllAgents(): void {
    log.debug('Removing all Agent instances', { totalAgents: this.agents.size });
    
    this.agents.forEach((agent, accountKey) => {
      agent.dispose();
      log.debug('Agent disposed', { accountKey });
    });
    
    this.agents.clear();
    log.debug('All Agent instances removed');
  }

  /**
   * 現在管理されているAgentの数を取得
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * 管理されているすべてのアカウントのDIDを取得
   */
  getManagedAccountDids(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 指定されたアカウントのAgentが管理されているかチェック
   */
  hasAgent(account: Account): boolean {
    return this.agents.has(account.profile.did);
  }

  /**
   * デバッグ用: 現在の状態を表示
   */
  debugStatus(): void {
    log.debug('AgentManager Status', {
      totalAgents: this.agents.size,
      managedDids: this.getManagedAccountDids()
    });
  }
}

// シングルトンインスタンス
export const agentManager = new AgentManager();