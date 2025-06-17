import { Agent } from './agent.js';
import { authService } from './authStore.js';
import type { 
  AgentResult, 
  AgentManagerOptions, 
  AgentInfo,
  AgentError 
} from '../types/agent.js';
import type { Account } from '../types/auth.js';

/**
 * 複数 Agent インスタンスの管理クラス
 * マルチアカウント並列処理の基盤を提供
 */
export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private options: Required<AgentManagerOptions>;
  private cleanupTimer?: number;

  constructor(options: AgentManagerOptions = {}) {
    this.options = {
      maxAgents: options.maxAgents ?? 10,
      autoCleanupInterval: options.autoCleanupInterval ?? 30 * 60 * 1000, // 30分
      retryCount: options.retryCount ?? 3
    };

    // 自動クリーンアップを開始
    this.startAutoCleanup();
  }

  /**
   * アカウントから Agent を作成・取得
   */
  async getAgent(accountId: string): Promise<AgentResult<Agent>> {
    try {
      // 既存の Agent があればそれを返す
      const existingAgent = this.agents.get(accountId);
      if (existingAgent && existingAgent.status !== 'disposed') {
        return { success: true, data: existingAgent };
      }

      // アカウント情報を取得
      const accountResult = await this.getAccountById(accountId);
      if (!accountResult.success || !accountResult.data) {
        return {
          success: false,
          error: {
            type: 'AGENT_NOT_FOUND',
            message: `Account not found: ${accountId}`
          }
        };
      }

      // 新しい Agent を作成
      const agent = new Agent(accountResult.data);
      
      // セッション検証
      const isValid = await agent.validateSession();
      if (!isValid) {
        return {
          success: false,
          error: {
            type: 'SESSION_INVALID',
            message: `Invalid session for account: ${accountId}`
          }
        };
      }

      // Agent を登録
      this.agents.set(accountId, agent);

      // 最大数制限をチェック
      await this.enforceMaxAgents();

      return { success: true, data: agent };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to create agent: ${error}`
        }
      };
    }
  }

  /**
   * 全ての登録済み Agent を取得
   */
  async getAllAgents(): Promise<AgentResult<Agent[]>> {
    try {
      const accountsResult = await authService.getAllAccounts();
      if (!accountsResult.success) {
        return {
          success: false,
          error: {
            type: 'AGENT_NOT_FOUND',
            message: 'Failed to get accounts'
          }
        };
      }

      const agents: Agent[] = [];
      for (const account of accountsResult.data!) {
        const agentResult = await this.getAgent(account.id);
        if (agentResult.success && agentResult.data) {
          agents.push(agentResult.data);
        }
      }

      return { success: true, data: agents };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to get all agents: ${error}`
        }
      };
    }
  }

  /**
   * アクティブな Agent のみを取得
   */
  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'active'
    );
  }

  /**
   * 特定の Agent を削除
   */
  removeAgent(accountId: string): AgentResult {
    const agent = this.agents.get(accountId);
    if (agent) {
      agent.dispose();
      this.agents.delete(accountId);
      return { success: true };
    }

    return {
      success: false,
      error: {
        type: 'AGENT_NOT_FOUND',
        message: `Agent not found: ${accountId}`
      }
    };
  }

  /**
   * 全ての Agent を削除
   */
  removeAllAgents(): AgentResult {
    for (const agent of this.agents.values()) {
      agent.dispose();
    }
    this.agents.clear();
    return { success: true };
  }

  /**
   * Agent の詳細情報を取得
   */
  getAgentInfo(accountId: string): AgentInfo | null {
    const agent = this.agents.get(accountId);
    return agent ? agent.getInfo() : null;
  }

  /**
   * 全 Agent の詳細情報を取得
   */
  getAllAgentInfo(): AgentInfo[] {
    return Array.from(this.agents.values()).map(agent => agent.getInfo());
  }

  /**
   * 非アクティブな Agent を削除
   */
  cleanupInactiveAgents(): number {
    let removedCount = 0;
    const cutoffTime = Date.now() - this.options.autoCleanupInterval;

    for (const [accountId, agent] of this.agents.entries()) {
      const lastUsed = new Date(agent.getInfo().lastUsedAt).getTime();
      
      if (lastUsed < cutoffTime || agent.status === 'disposed' || agent.status === 'error') {
        agent.dispose();
        this.agents.delete(accountId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    // 自動クリーンアップを停止
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // 全 Agent を削除
    this.removeAllAgents();
  }

  /**
   * アカウント ID からアカウント情報を取得
   */
  private async getAccountById(accountId: string): Promise<AgentResult<Account | null>> {
    try {
      const allAccountsResult = await authService.getAllAccounts();
      if (!allAccountsResult.success) {
        return {
          success: false,
          error: {
            type: 'AGENT_NOT_FOUND',
            message: 'Failed to get accounts'
          }
        };
      }

      const account = allAccountsResult.data!.find(acc => acc.id === accountId);
      return { success: true, data: account || null };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_NOT_FOUND',
          message: `Failed to get account: ${error}`
        }
      };
    }
  }

  /**
   * 最大 Agent 数制限を適用
   */
  private async enforceMaxAgents(): Promise<void> {
    if (this.agents.size <= this.options.maxAgents) {
      return;
    }

    // 最も古い Agent から削除
    const agentInfos = this.getAllAgentInfo()
      .sort((a, b) => new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime());

    const toRemove = this.agents.size - this.options.maxAgents;
    for (let i = 0; i < toRemove; i++) {
      this.removeAgent(agentInfos[i].id);
    }
  }

  /**
   * 自動クリーンアップを開始
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveAgents();
    }, this.options.autoCleanupInterval) as unknown as number;
  }
}

// シングルトンインスタンス
export const agentManager = new AgentManager();