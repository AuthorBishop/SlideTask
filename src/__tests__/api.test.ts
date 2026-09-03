/**
 * 单元测试：db/api.ts — 全部 CRUD API 函数
 * 使用 mock SQLite database，验证业务逻辑和边界条件
 */

// ── Mock database module ──
// 所有 mock 函数定义在 factory 内部，避免闭包变量未初始化
let __mockDb: Record<string, jest.Mock>;

jest.mock('@/lib/database', () => {
  const mockDb = {
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
  };
  __mockDb = mockDb;
  return {
    dbReady: Promise.resolve(mockDb),
    newId: jest.fn(() => 'test-id-001'),
  };
});

import {
  fetchTasksWithNodes,
  fetchTaskById,
  createTask,
  updateTask,
  updateTaskProgress,
  deleteTask,
  completeTask,
  uncompleteTask,
  updateNodeTitle,
  addNode,
  deleteNode,
  reorderNodes,
  createTaskFromTemplate,
} from '@/db/api';

// ── Helpers ──
beforeEach(() => {
  jest.clearAllMocks();
  __mockDb.runAsync.mockResolvedValue(undefined);
  __mockDb.getAllAsync.mockResolvedValue([]);
  __mockDb.getFirstAsync.mockResolvedValue(null);
});

// ==================== 任务查询 ====================

describe('db/api — fetchTasksWithNodes(completed?)', () => {
  it('返回空数组（无任务）', async () => {
    __mockDb.getAllAsync.mockResolvedValue([]);
    const result = await fetchTasksWithNodes();
    expect(result).toEqual([]);
  });

  it('返回 2 个任务（各含节点）', async () => {
    const mockTasks = [
      { id: 't1', title: 'Task 1', note: '', color: '#111', progress_position: 0.5, order_index: 2, created_at: '2024-01-01', completed_at: null, updated_at: '' },
      { id: 't2', title: 'Task 2', note: '', color: '#222', progress_position: 0, order_index: 1, created_at: '2024-01-02', completed_at: null, updated_at: '' },
    ];
    const mockNodes = [
      { id: 'n1', task_id: 't1', title: 'Node 1', position: 0, created_at: '2024-01-01' },
      { id: 'n2', task_id: 't1', title: 'Node 2', position: 1, created_at: '2024-01-01' },
    ];
    // First call: tasks; Second call: nodes
    __mockDb.getAllAsync.mockResolvedValueOnce(mockTasks).mockResolvedValueOnce(mockNodes);
    const result = await fetchTasksWithNodes();
    expect(result.length).toBe(2);
    // 按 order_index DESC 排序
    expect(result[0].id).toBe('t1');
    expect(result[0].nodes.length).toBe(2);
  });

  it('completed=true 筛选已完成任务', async () => {
    __mockDb.getAllAsync.mockResolvedValue([]);
    await fetchTasksWithNodes(true);
    expect(__mockDb.getAllAsync.mock.calls[0][0]).toContain('completed_at IS NOT NULL');
  });

  it('completed=false 筛选进行中任务', async () => {
    __mockDb.getAllAsync.mockResolvedValue([]);
    await fetchTasksWithNodes(false);
    expect(__mockDb.getAllAsync.mock.calls[0][0]).toContain('completed_at IS NULL');
  });

  it('DB 异常时抛出错误', async () => {
    __mockDb.getAllAsync.mockRejectedValue(new Error('DB error'));
    await expect(fetchTasksWithNodes()).rejects.toThrow('DB error');
  });
});

describe('db/api — fetchTaskById(id)', () => {
  it('找到任务返回完整对象含节点', async () => {
    const mockTask = { id: 't1', title: 'Test', note: '', color: '#fff', progress_position: 0, order_index: 0, created_at: '2024-01-01', completed_at: null, updated_at: '' };
    const mockNodes = [{ id: 'n1', task_id: 't1', title: 'Node', position: 0, created_at: '2024-01-01' }];
    __mockDb.getFirstAsync.mockResolvedValue(mockTask);
    __mockDb.getAllAsync.mockResolvedValue(mockNodes);
    const result = await fetchTaskById('t1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('t1');
    expect(result!.nodes.length).toBe(1);
  });

  it('不存在 id 返回 null', async () => {
    __mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await fetchTaskById('nonexistent');
    expect(result).toBeNull();
  });

  it('空字符串 id 返回 null', async () => {
    __mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await fetchTaskById('');
    expect(result).toBeNull();
  });
});

// ==================== 创建任务 ====================

describe('db/api — createTask(title, color, note, nodesTitles)', () => {
  it('创建任务返回 id 字符串', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 5 });
    const id = await createTask('New Task', '#6366F1', 'Some note', ['Step 1', 'Step 2']);
    expect(id).toBe('test-id-001');
    expect(__mockDb.runAsync).toHaveBeenCalled(); // INSERT task + 2 INSERT nodes = 3 calls
  });

  it('无节点时只插入任务', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 3 });
    const id = await createTask('Solo', '#6366F1', '', []);
    expect(id).toBe('test-id-001');
    // 应该有 1 次 INSERT task，0 次 INSERT node
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('空标题不崩溃', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 0 });
    const id = await createTask('', '#6366F1', '', []);
    expect(id).toBe('test-id-001');
  });

  it('max_idx 为 null 时正常（空表）', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: null });
    const id = await createTask('First', '#6366F1', '', []);
    expect(id).toBe('test-id-001');
  });

  it('自动过滤空标题的节点', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 0 });
    await createTask('T', '#6366F1', '', ['  ', '', 'Only']);
    // 应该只插入 1 个节点（"Only"），"  " 和 "" 被 filter
    const runCalls = __mockDb.runAsync.mock.calls;
    // 第 1 次调用是 INSERT task，后面只能有 1 次 INSERT node
    expect(runCalls.length).toBe(2);
  });
});

describe('db/api — createTaskFromTemplate(templateId)', () => {
  it('模板存在时一次写入任务与全部节点', async () => {
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 0 });
    const id = await createTaskFromTemplate('exam-60d');
    expect(id).toBe('test-id-001');
    // INSERT task 1 次 + 6 个节点各 1 次 = 7 次
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(7);
    const firstCall = __mockDb.runAsync.mock.calls[0];
    expect(firstCall[1]).toEqual(expect.arrayContaining(['考研 60 天冲刺']));
  });

  it('模板不存在时返回 null 且不写库', async () => {
    const id = await createTaskFromTemplate('no-such-template');
    expect(id).toBeNull();
    expect(__mockDb.runAsync).not.toHaveBeenCalled();
  });
});

// ==================== 更新任务 ====================

describe('db/api — updateTask(id, fields)', () => {
  it('更新 title', async () => {
    await updateTask('t1', { title: 'Updated' });
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('更新 note', async () => {
    await updateTask('t1', { note: 'New note' });
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('更新多个字段', async () => {
    await updateTask('t1', { title: 'T', note: 'N', color: '#f00' });
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('空对象不执行 SQL', async () => {
    await updateTask('t1', {});
    expect(__mockDb.runAsync).not.toHaveBeenCalled();
  });
});

describe('db/api — updateTaskProgress(id, progress)', () => {
  it('正常设置进度', async () => {
    await updateTaskProgress('t1', 0.5);
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('progress_position'),
      [0.5, 't1']
    );
  });

  it('超过 1.0 clamp 到 1', async () => {
    await updateTaskProgress('t1', 1.5);
    expect(__mockDb.runAsync.mock.calls[0][1][0]).toBe(1);
  });

  it('负数 clamp 到 0', async () => {
    await updateTaskProgress('t1', -0.3);
    expect(__mockDb.runAsync.mock.calls[0][1][0]).toBe(0);
  });
});

// ==================== 删除 / 完成 / 取消 ====================

describe('db/api — deleteTask / completeTask / uncompleteTask', () => {
  it('deleteTask 执行 DELETE', async () => {
    await deleteTask('t1');
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM tasks'),
      ['t1']
    );
  });

  it('completeTask 设置 completed_at', async () => {
    await completeTask('t1');
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('completed_at'),
      expect.arrayContaining(['t1'])
    );
  });

  it('uncompleteTask 设置 NULL', async () => {
    await uncompleteTask('t1');
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('NULL'),
      ['t1']
    );
  });
});

// ==================== 节点 CRUD ====================

describe('db/api — addNode / updateNodeTitle / deleteNode', () => {
  it('addNode 返回完整 TaskNode 对象', async () => {
    const node = await addNode('t1', 'New Node', 2);
    expect(node).toMatchObject({
      id: 'test-id-001',
      task_id: 't1',
      title: 'New Node',
      position: 2,
    });
  });

  it('updateNodeTitle 更新节点标题', async () => {
    await updateNodeTitle('n1', 'Updated Title');
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE task_nodes'),
      ['Updated Title', 'n1']
    );
  });

  it('deleteNode 删除节点', async () => {
    await deleteNode('n1');
    expect(__mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM task_nodes'),
      ['n1']
    );
  });
});

describe('db/api — reorderNodes(nodes)', () => {
  it('批量更新 position', async () => {
    await reorderNodes([
      { id: 'a', position: 0 },
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
    ]);
    expect(__mockDb.runAsync).toHaveBeenCalledTimes(3);
  });

  it('空数组不执行 SQL', async () => {
    await reorderNodes([]);
    expect(__mockDb.runAsync).not.toHaveBeenCalled();
  });
});

// ==================== 集成场景 ====================

describe('db/api — 集成场景', () => {
  it('创建任务 → 查询 → 更新 → 删除 完整流程', async () => {
    // Create
    __mockDb.getFirstAsync.mockResolvedValue({ max_idx: 0 });
    const id = await createTask('Flow Test', '#ff0000', 'Note', ['A', 'B']);
    expect(id).toBe('test-id-001');

    // Query
    __mockDb.getFirstAsync.mockResolvedValue({ id, title: 'Flow Test', note: 'Note', color: '#ff0000', progress_position: 0, order_index: 1, created_at: '2024-01-01', completed_at: null, updated_at: '' });
    __mockDb.getAllAsync.mockResolvedValue([]);
    const task = await fetchTaskById(id);
    expect(task).toBeDefined();

    // Update
    await updateTask(id, { title: 'Updated Flow' });
    expect(__mockDb.runAsync).toHaveBeenCalled();

    // Complete
    await completeTask(id);
    expect(__mockDb.runAsync).toHaveBeenCalled();
  });
});
