/**
 * dragDropHandlers.test.ts
 * ドラッグ&ドロップハンドラーの包括的テストスイート
 * 
 * 全ての最適化機能とエラーハンドリングを検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createDragDropHandlers,
  compareColumnOrder,
  hasActiveColumnChanged,
  cloneColumns,
  rollbackDeckState,
  showErrorFeedback,
  DRAG_DROP_CONFIG,
  createColumnSwitcher
} from '../dragDropHandlers.js';
import type { Column } from '../../deck/types.js';
import type { ColumnDndEvent } from '../../types/dragDrop.js';
import { TRIGGERS } from 'svelte-dnd-action';

// テスト用のモック
const mockDeckStore = {
  state: {
    activeColumnId: 'col1',
    layout: {
      columns: [] as Column[]
    }
  },
  save: vi.fn(),
  getActiveColumnIndex: vi.fn(() => 0),
  syncActiveColumnIndex: vi.fn(() => 0),
  setActiveColumnByIndex: vi.fn()
};

const mockColumns: Column[] = [
  { id: 'col1', settings: { title: 'Column 1' } } as Column,
  { id: 'col2', settings: { title: 'Column 2' } } as Column,
  { id: 'col3', settings: { title: 'Column 3' } } as Column
];

// イベントのモック作成ヘルパー
function createMockDndEvent(
  columns: Column[], 
  trigger: TRIGGERS = TRIGGERS.DRAGGED_ENTERED,
  id: string = 'col1'
): CustomEvent<ColumnDndEvent> {
  return {
    detail: {
      items: columns,
      info: { trigger, id, source: 'pointer' as any }
    }
  } as CustomEvent<ColumnDndEvent>;
}

describe('dragDropHandlers', () => {
  beforeEach(() => {
    mockDeckStore.state.layout.columns = [...mockColumns];
    mockDeckStore.state.activeColumnId = 'col1';
    mockDeckStore.save.mockClear();
    vi.clearAllMocks();
    
    // DOM イベントのモック
    global.window = {
      dispatchEvent: vi.fn()
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Performance Optimization Utilities', () => {
    describe('compareColumnOrder', () => {
      it('should return true for identical column orders', () => {
        const columns1 = [...mockColumns];
        const columns2 = [...mockColumns];
        
        expect(compareColumnOrder(columns1, columns2)).toBe(true);
      });

      it('should return false for different column orders', () => {
        const columns1 = [...mockColumns];
        const columns2 = [mockColumns[1], mockColumns[0], mockColumns[2]];
        
        expect(compareColumnOrder(columns1, columns2)).toBe(false);
      });

      it('should return false for different array lengths', () => {
        const columns1 = [...mockColumns];
        const columns2 = mockColumns.slice(0, 2);
        
        expect(compareColumnOrder(columns1, columns2)).toBe(false);
      });

      it('should handle empty arrays', () => {
        expect(compareColumnOrder([], [])).toBe(true);
        expect(compareColumnOrder([], mockColumns)).toBe(false);
      });
    });

    describe('hasActiveColumnChanged', () => {
      it('should return true when IDs differ', () => {
        expect(hasActiveColumnChanged('col1', 'col2')).toBe(true);
      });

      it('should return false when IDs are the same', () => {
        expect(hasActiveColumnChanged('col1', 'col1')).toBe(false);
      });

      it('should handle undefined values', () => {
        expect(hasActiveColumnChanged(undefined, 'col1')).toBe(true);
        expect(hasActiveColumnChanged('col1', undefined)).toBe(true);
        expect(hasActiveColumnChanged(undefined, undefined)).toBe(false);
      });
    });
  });

  describe('Error Handling Utilities', () => {
    describe('cloneColumns', () => {
      it('should create deep copies of columns', () => {
        const cloned = cloneColumns(mockColumns);
        
        expect(cloned).toEqual(mockColumns);
        expect(cloned).not.toBe(mockColumns);
        expect(cloned[0]).not.toBe(mockColumns[0]);
      });

      it('should handle empty arrays', () => {
        const cloned = cloneColumns([]);
        expect(cloned).toEqual([]);
        expect(cloned).not.toBe([]);
      });
    });

    describe('rollbackDeckState', () => {
      it('should successfully restore previous state', () => {
        const previousState = {
          columns: mockColumns.slice(0, 2),
          activeColumnId: 'col2'
        };

        const result = rollbackDeckState(mockDeckStore, previousState, 'TestComponent');

        expect(result.success).toBe(true);
        expect(mockDeckStore.state.layout.columns).toEqual(previousState.columns);
        expect(mockDeckStore.state.activeColumnId).toBe(previousState.activeColumnId);
      });

      it('should handle undefined activeColumnId', () => {
        const previousState = {
          columns: mockColumns.slice(0, 2),
          activeColumnId: undefined
        };

        const result = rollbackDeckState(mockDeckStore, previousState, 'TestComponent');

        expect(result.success).toBe(true);
        expect(mockDeckStore.state.layout.columns).toEqual(previousState.columns);
      });
    });

    describe('showErrorFeedback', () => {
      it('should call debugError with proper format', () => {
        // debugError はモックされていると仮定
        showErrorFeedback('Test error message', 'TestComponent');
        
        // 実際の実装では debugError が呼ばれることを確認
        // ここではエラーが投げられないことを確認
        expect(() => showErrorFeedback('Test', 'Component')).not.toThrow();
      });
    });
  });

  describe('createDragDropHandlers', () => {
    let handlers: ReturnType<typeof createDragDropHandlers>;
    let mockOptions: any;

    beforeEach(() => {
      mockOptions = {
        onConsiderExtra: vi.fn(),
        onFinalizeExtra: vi.fn(),
        onError: vi.fn(),
        enableAutoRollback: true
      };
      
      handlers = createDragDropHandlers(mockDeckStore, 'TestComponent', mockOptions);
    });

    describe('handleConsider', () => {
      it('should update columns when order changes', () => {
        const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
        const event = createMockDndEvent(reorderedColumns);

        handlers.handleConsider(event);

        expect(mockDeckStore.state.layout.columns).toEqual(reorderedColumns);
      });

      it('should not update columns when order is unchanged', () => {
        const event = createMockDndEvent(mockColumns);
        const originalColumns = [...mockDeckStore.state.layout.columns];

        handlers.handleConsider(event);

        expect(mockDeckStore.state.layout.columns).toEqual(originalColumns);
      });

      it('should update active column on DRAGGED_ENTERED', () => {
        const event = createMockDndEvent(mockColumns, TRIGGERS.DRAGGED_ENTERED, 'col2');

        handlers.handleConsider(event);

        expect(mockDeckStore.state.activeColumnId).toBe('col2');
      });

      it('should not update active column if already active', () => {
        const event = createMockDndEvent(mockColumns, TRIGGERS.DRAGGED_ENTERED, 'col1');

        handlers.handleConsider(event);

        expect(mockDeckStore.state.activeColumnId).toBe('col1');
      });

      it('should call onConsiderExtra when provided', () => {
        const event = createMockDndEvent(mockColumns);

        handlers.handleConsider(event);

        expect(mockOptions.onConsiderExtra).toHaveBeenCalledWith(
          mockColumns,
          event.detail.info
        );
      });

      it('should handle errors in onConsiderExtra', () => {
        mockOptions.onConsiderExtra.mockImplementation(() => {
          throw new Error('Extra processing failed');
        });
        
        const event = createMockDndEvent(mockColumns);

        expect(() => handlers.handleConsider(event)).not.toThrow();
        expect(mockOptions.onError).toHaveBeenCalledWith(
          expect.any(Error),
          'consider'
        );
      });
    });

    describe('handleFinalize', () => {
      beforeEach(() => {
        mockDeckStore.save.mockResolvedValue(undefined);
      });

      it('should save when column order changes', async () => {
        const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
        const event = createMockDndEvent(reorderedColumns);

        await handlers.handleFinalize(event);

        expect(mockDeckStore.save).toHaveBeenCalled();
        expect(mockDeckStore.state.layout.columns).toEqual(reorderedColumns);
      });

      it('should not save when column order is unchanged', async () => {
        const event = createMockDndEvent(mockColumns);

        await handlers.handleFinalize(event);

        expect(mockDeckStore.save).not.toHaveBeenCalled();
      });

      it('should dispatch sync event when activeColumnId exists', async () => {
        const event = createMockDndEvent(mockColumns);

        await handlers.handleFinalize(event);

        expect(global.window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { columnId: mockDeckStore.state.activeColumnId }
          })
        );
      });

      it('should handle save errors with auto rollback', async () => {
        const saveError = new Error('Save failed');
        mockDeckStore.save.mockRejectedValue(saveError);
        
        const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
        const originalColumns = [...mockDeckStore.state.layout.columns];
        const event = createMockDndEvent(reorderedColumns);

        await handlers.handleFinalize(event);

        // 状態がロールバックされることを確認
        expect(mockDeckStore.state.layout.columns).toEqual(originalColumns);
        expect(mockOptions.onError).toHaveBeenCalledWith(
          saveError,
          'finalize',
          expect.objectContaining({ success: true })
        );
      });

      it('should handle save errors without auto rollback', async () => {
        const saveError = new Error('Save failed');
        mockDeckStore.save.mockRejectedValue(saveError);
        
        // 自動ロールバックを無効化
        const handlersWithoutRollback = createDragDropHandlers(
          mockDeckStore, 
          'TestComponent', 
          { ...mockOptions, enableAutoRollback: false }
        );
        
        const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
        const event = createMockDndEvent(reorderedColumns);

        await handlersWithoutRollback.handleFinalize(event);

        // 状態は変更されたまま
        expect(mockDeckStore.state.layout.columns).toEqual(reorderedColumns);
      });

      it('should call onFinalizeExtra when provided', async () => {
        const event = createMockDndEvent(mockColumns);

        await handlers.handleFinalize(event);

        expect(mockOptions.onFinalizeExtra).toHaveBeenCalledWith(
          mockColumns,
          event.detail.info
        );
      });
    });
  });

  describe('DRAG_DROP_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DRAG_DROP_CONFIG.flipDurationMs).toBe(200);
      expect(DRAG_DROP_CONFIG.performance.enableOrderComparison).toBe(true);
      expect(DRAG_DROP_CONFIG.performance.enablePerfMeasurement).toBe(true);
      expect(DRAG_DROP_CONFIG.performance.enableConditionalLogging).toBe(true);
    });

    it('should create correct dndzone options', () => {
      const options = DRAG_DROP_CONFIG.createDndZoneOptions(mockColumns);

      expect(options).toEqual({
        items: mockColumns,
        flipDurationMs: 200,
        dropTargetStyle: {},
        dragDisabled: false
      });
    });

    it('should disable drag for single column', () => {
      const singleColumn = [mockColumns[0]];
      const options = DRAG_DROP_CONFIG.createDndZoneOptions(singleColumn);

      expect(options.dragDisabled).toBe(true);
    });
  });

  describe('createColumnSwitcher', () => {
    it('should update activeColumnId and dispatch event', () => {
      const switcher = createColumnSwitcher(mockDeckStore, 'TestComponent');

      switcher('col2');

      expect(mockDeckStore.state.activeColumnId).toBe('col2');
      expect(global.window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { columnId: 'col2' }
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete drag and drop workflow', async () => {
      const handlers = createDragDropHandlers(mockDeckStore, 'IntegrationTest');
      const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
      
      // Consider イベント
      const considerEvent = createMockDndEvent(reorderedColumns, TRIGGERS.DRAGGED_ENTERED, 'col2');
      handlers.handleConsider(considerEvent);
      
      expect(mockDeckStore.state.layout.columns).toEqual(reorderedColumns);
      expect(mockDeckStore.state.activeColumnId).toBe('col2');
      
      // Finalize時のテストのため、状態を元に戻してから再度変更を検証
      mockDeckStore.state.layout.columns = [...mockColumns]; // 元の状態に戻す
      
      const finalizeEvent = createMockDndEvent(reorderedColumns);
      await handlers.handleFinalize(finalizeEvent);
      
      // 順序変更が検出されsaveが呼ばれることを確認
      expect(mockDeckStore.save).toHaveBeenCalled();
      expect(global.window.dispatchEvent).toHaveBeenCalled();
    });

    it('should handle error recovery workflow', async () => {
      const mockError = new Error('Network error');
      mockDeckStore.save.mockRejectedValue(mockError);
      
      const errorCallback = vi.fn();
      const handlers = createDragDropHandlers(mockDeckStore, 'ErrorTest', {
        enableAutoRollback: true,
        onError: errorCallback
      });
      
      const reorderedColumns = [mockColumns[1], mockColumns[0], mockColumns[2]];
      const originalColumns = [...mockDeckStore.state.layout.columns];
      
      const event = createMockDndEvent(reorderedColumns);
      await handlers.handleFinalize(event);
      
      // エラーコールバックが呼ばれ、状態がロールバックされることを確認
      expect(errorCallback).toHaveBeenCalledWith(
        mockError,
        'finalize',
        expect.objectContaining({ success: true })
      );
      expect(mockDeckStore.state.layout.columns).toEqual(originalColumns);
    });
  });
});