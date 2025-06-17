import { agentManager } from './agentManager.js';
import { authService } from './authStore.js';
import type { Agent } from './agent.js';
import type { Account } from '../types/auth.js';
import type { AgentResult } from '../types/agent.js';

/**
 * マルチアカウント管理の統合サービス
 * AuthService と AgentManager を連携させて一元管理を提供
 */
export class MultiAccountService {
  
  /**
   * 全てのアカウントに対応するエージェントを初期化
   */
  async initializeAllAgents(): Promise<AgentResult<Agent[]>> {
    try {
      const accountsResult = await authService.getAllAccounts();
      if (!accountsResult.success) {
        return {
          success: false,
          error: {
            type: 'AGENT_CREATION_FAILED',
            message: 'Failed to get accounts for initialization'
          }
        };
      }

      const agents: Agent[] = [];
      const errors: string[] = [];

      for (const account of accountsResult.data!) {
        const agentResult = await agentManager.getAgent(account.id);
        if (agentResult.success && agentResult.data) {
          agents.push(agentResult.data);
        } else {
          errors.push(`Failed to initialize agent for ${account.profile.handle}: ${agentResult.error?.message}`);
        }
      }

      if (errors.length > 0) {
        console.warn('Some agents failed to initialize:', errors);
      }

      return { success: true, data: agents };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to initialize agents: ${error}`
        }
      };
    }
  }

  /**
   * アクティブアカウントのエージェントを取得
   */
  async getActiveAccountAgent(): Promise<AgentResult<Agent | null>> {
    try {
      const activeAccountResult = await authService.getActiveAccount();
      if (!activeAccountResult.success || !activeAccountResult.data) {
        return { success: true, data: null };
      }

      const agentResult = await agentManager.getAgent(activeAccountResult.data.id);
      return agentResult;
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_NOT_FOUND',
          message: `Failed to get active account agent: ${error}`
        }
      };
    }
  }

  /**
   * 新しいアカウントを追加してエージェントを作成
   */
  async addAccount(
    service: string,
    session: any,
    profile: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    }
  ): Promise<AgentResult<{ account: Account; agent: Agent }>> {
    try {
      // アカウントを保存
      const accountResult = await authService.saveAccount(service, session, profile);
      if (!accountResult.success || !accountResult.data) {
        return {
          success: false,
          error: {
            type: 'AGENT_CREATION_FAILED',
            message: 'Failed to save account'
          }
        };
      }

      // エージェントを作成
      const agentResult = await agentManager.getAgent(accountResult.data.id);
      if (!agentResult.success || !agentResult.data) {
        return {
          success: false,
          error: {
            type: 'AGENT_CREATION_FAILED',
            message: 'Failed to create agent for new account'
          }
        };
      }

      return {
        success: true,
        data: {
          account: accountResult.data,
          agent: agentResult.data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to add account: ${error}`
        }
      };
    }
  }

  /**
   * アカウントを削除してエージェントも削除
   */
  async removeAccount(accountId: string): Promise<AgentResult> {
    try {
      // エージェントを削除
      const agentRemovalResult = agentManager.removeAgent(accountId);
      
      // アカウントを削除
      const accountRemovalResult = await authService.deleteAccount(accountId);
      
      if (!accountRemovalResult.success) {
        return {
          success: false,
          error: {
            type: 'AGENT_CREATION_FAILED',
            message: accountRemovalResult.error?.message || 'Failed to delete account'
          }
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to remove account: ${error}`
        }
      };
    }
  }

  /**
   * 全てのアカウントと対応するエージェント情報を取得
   */
  async getAllAccountsWithAgents(): Promise<AgentResult<Array<{ account: Account; agent: Agent | null }>>> {
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

      const accountsWithAgents = [];
      for (const account of accountsResult.data!) {
        const agentResult = await agentManager.getAgent(account.id);
        accountsWithAgents.push({
          account,
          agent: agentResult.success && agentResult.data ? agentResult.data : null
        });
      }

      return { success: true, data: accountsWithAgents };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'AGENT_CREATION_FAILED',
          message: `Failed to get accounts with agents: ${error}`
        }
      };
    }
  }

  /**
   * 全てのエージェントのセッションを検証
   */
  async validateAllSessions(): Promise<{ validCount: number; invalidCount: number; details: Array<{ accountId: string; handle: string; isValid: boolean }> }> {
    const agents = agentManager.getActiveAgents();
    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const agent of agents) {
      const isValid = await agent.validateSession();
      results.push({
        accountId: agent.account.id,
        handle: agent.account.profile.handle,
        isValid
      });

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    return {
      validCount,
      invalidCount,
      details: results
    };
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup(): void {
    agentManager.dispose();
  }
}

// シングルトンインスタンス
export const multiAccountService = new MultiAccountService();